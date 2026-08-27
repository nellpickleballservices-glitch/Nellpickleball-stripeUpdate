-- Play sessions: recurring weekly pickleball games people can sign up and pay for.
--
-- A row in `play_sessions` is a TEMPLATE, not a single game: it says "Open Play,
-- every Tue + Thu, 6-8pm, 10 players, $15" and the site projects that forward
-- `weeks_ahead` weeks into concrete dates. Sign-ups attach to (session_id, date),
-- so each individual date carries its own capacity and its own roster.

create table if not exists public.play_sessions (
  id              uuid primary key default gen_random_uuid(),

  -- Card + page copy (bilingual, mirrors the expeditions pattern)
  title_es        text not null,
  title_en        text not null,
  description_es  text,
  description_en  text,
  -- JSON-encoded page-builder blocks (see lib/types/expedition-blocks.ts)
  details_es      text,
  details_en      text,

  image_url       text,
  image_urls      text[] not null default '{}',

  -- Recurrence: ISO-ish day numbers, 0 = Sunday .. 6 = Saturday.
  days_of_week    smallint[] not null default '{}',
  start_time      time not null,
  end_time        time not null,
  -- How far forward to project dates on the public page.
  weeks_ahead     integer not null default 8
                    check (weeks_ahead between 1 and 52),
  -- Individual dates the admin has cancelled (holidays, court maintenance).
  blackout_dates  date[] not null default '{}',

  capacity        integer not null default 10
                    check (capacity between 1 and 100),
  price_cents     integer not null default 0
                    check (price_cents >= 0 and price_cents <= 1000000),
  currency        text not null default 'usd'
                    check (currency in ('usd', 'dop')),

  -- Which payment paths the sign-up form offers.
  allow_stripe    boolean not null default true,
  allow_cash      boolean not null default true,

  location_name   text,
  is_published    boolean not null default false,
  sort_order      integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint play_sessions_time_order check (end_time > start_time),
  -- A session nobody can pay for is a configuration mistake, not a valid state.
  constraint play_sessions_payment_method check (allow_stripe or allow_cash)
);

create index if not exists play_sessions_published_idx
  on public.play_sessions (is_published, sort_order);


-- ─────────────────────────────────────────────────────────────────────────
-- Sign-ups
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.session_signups (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.play_sessions(id) on delete cascade,
  -- The specific projected date this person booked.
  session_date      date not null,

  name              text not null,
  email             text not null,
  phone             text,

  payment_method    text not null
                      check (payment_method in ('stripe', 'cash')),
  payment_status    text not null default 'pending'
                      check (payment_status in ('pending', 'paid', 'cancelled', 'refunded')),
  amount_cents      integer not null default 0,
  currency          text not null default 'usd',

  -- Stripe Checkout correlation. Unique so a replayed webhook can't double-apply.
  stripe_session_id     text unique,
  stripe_payment_intent text,

  -- Stripe sign-ups reserve their spot only until this moment. If the person
  -- abandons the Checkout page, the hold lapses and the spot frees itself with
  -- no cron job required. Cash sign-ups hold indefinitely (null).
  hold_expires_at   timestamptz,

  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists session_signups_session_date_idx
  on public.session_signups (session_id, session_date);
create index if not exists session_signups_created_at_idx
  on public.session_signups (created_at desc);
create index if not exists session_signups_status_idx
  on public.session_signups (payment_status);


-- ─────────────────────────────────────────────────────────────────────────
-- Capacity accounting
-- ─────────────────────────────────────────────────────────────────────────

-- A sign-up occupies a spot when it is pending or paid AND its hold (if any)
-- has not lapsed. Centralized here so the booking function and the public
-- "spots remaining" display can never drift apart.
create or replace function public.session_taken_count(p_session_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.session_signups s
  where s.session_id = p_session_id
    and s.session_date = p_date
    and s.payment_status in ('pending', 'paid')
    and (s.hold_expires_at is null or s.hold_expires_at > now())
$$;


-- Books one spot atomically.
--
-- Two people paying for the last spot at the same instant is a real scenario,
-- and a check-then-insert in application code cannot prevent it: both requests
-- read "9 of 10 taken" before either writes. The transaction-scoped advisory
-- lock serializes bookings per (session, date) so the count is always read
-- under exclusive access. It releases automatically at commit or rollback.
create or replace function public.book_session_spot(
  p_session_id     uuid,
  p_date           date,
  p_name           text,
  p_email          text,
  p_phone          text,
  p_payment_method text,
  p_hold_minutes   integer default null
)
returns public.session_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session  public.play_sessions;
  v_taken    integer;
  v_row      public.session_signups;
begin
  select * into v_session
  from public.play_sessions
  where id = p_session_id;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if not v_session.is_published then
    raise exception 'SESSION_NOT_AVAILABLE';
  end if;
  if p_date = any(v_session.blackout_dates) then
    raise exception 'SESSION_DATE_CANCELLED';
  end if;
  -- 0 = Sunday, matching days_of_week. Rejects dates that aren't real
  -- occurrences of this template, so a hand-crafted request can't book one.
  if extract(dow from p_date)::smallint <> all(v_session.days_of_week) then
    raise exception 'SESSION_DATE_INVALID';
  end if;
  if p_date < (now() at time zone 'America/Santo_Domingo')::date then
    raise exception 'SESSION_DATE_PAST';
  end if;
  if p_payment_method = 'stripe' and not v_session.allow_stripe then
    raise exception 'PAYMENT_METHOD_NOT_ALLOWED';
  end if;
  if p_payment_method = 'cash' and not v_session.allow_cash then
    raise exception 'PAYMENT_METHOD_NOT_ALLOWED';
  end if;

  -- Serialize every booking for this exact (session, date) pair.
  perform pg_advisory_xact_lock(
    hashtextextended(p_session_id::text || ':' || p_date::text, 0)
  );

  v_taken := public.session_taken_count(p_session_id, p_date);
  if v_taken >= v_session.capacity then
    raise exception 'SESSION_FULL';
  end if;

  -- Same person, same game — almost always a double-submit, not two players.
  if exists (
    select 1 from public.session_signups s
    where s.session_id = p_session_id
      and s.session_date = p_date
      and lower(s.email) = lower(p_email)
      and s.payment_status in ('pending', 'paid')
      and (s.hold_expires_at is null or s.hold_expires_at > now())
  ) then
    raise exception 'ALREADY_SIGNED_UP';
  end if;

  insert into public.session_signups (
    session_id, session_date, name, email, phone,
    payment_method, payment_status, amount_cents, currency, hold_expires_at
  ) values (
    p_session_id, p_date, p_name, lower(p_email), p_phone,
    p_payment_method,
    'pending',
    v_session.price_cents,
    v_session.currency,
    case when p_hold_minutes is null then null
         else now() + make_interval(mins => p_hold_minutes) end
  )
  returning * into v_row;

  return v_row;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- RLS — the public never touches these tables directly. All reads and writes
-- go through server actions using the service role, exactly like expeditions.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.play_sessions enable row level security;
alter table public.session_signups enable row level security;

drop policy if exists "play_sessions_read_published" on public.play_sessions;
create policy "play_sessions_read_published"
  on public.play_sessions for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "play_sessions_service_role_all" on public.play_sessions;
create policy "play_sessions_service_role_all"
  on public.play_sessions for all
  to service_role
  using (true)
  with check (true);

-- Deliberately NO anon policy on session_signups: rosters contain other
-- people's names, emails, and phone numbers.
drop policy if exists "session_signups_service_role_all" on public.session_signups;
create policy "session_signups_service_role_all"
  on public.session_signups for all
  to service_role
  using (true)
  with check (true);

-- The booking function is security definer, so revoke the ability for
-- untrusted roles to call it with arbitrary arguments.
revoke all on function public.book_session_spot(uuid, date, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.session_taken_count(uuid, date) from public, anon, authenticated;
