-- Special events: one-off promotional events with early-bird pricing,
-- customizable card size, and a hero/banner section the admin can modify.
--
-- Mirrors the play_sessions pattern but adds promotional pricing fields
-- (promo_price_cents + promo_expires_at) and card display controls.

create table if not exists public.special_events (
  id              uuid primary key default gen_random_uuid(),

  -- Card + page copy (bilingual)
  title_es        text not null,
  title_en        text not null,
  description_es  text,
  description_en  text,
  -- JSON-encoded page-builder blocks
  details_es      text,
  details_en      text,

  image_url       text,
  image_urls      text[] not null default '{}',

  -- Event schedule (always one-time, no recurrence)
  event_date      date not null,
  start_time      time not null,
  end_time        time not null,

  capacity        integer not null default 20
                    check (capacity between 1 and 500),

  -- Regular price
  price_cents     integer not null default 0
                    check (price_cents >= 0 and price_cents <= 10000000),
  currency        text not null default 'usd'
                    check (currency in ('usd', 'dop')),

  -- Promotional / early-bird pricing
  promo_price_cents   integer
                        check (promo_price_cents is null or (promo_price_cents >= 0 and promo_price_cents <= 10000000)),
  promo_expires_at    timestamptz,

  -- Payment methods
  allow_stripe    boolean not null default true,
  allow_cash      boolean not null default true,

  -- Display customization
  card_size       text not null default 'normal'
                    check (card_size in ('normal', 'large', 'featured')),

  -- Hero/banner customization
  hero_title_es   text,
  hero_title_en   text,
  hero_subtitle_es text,
  hero_subtitle_en text,
  hero_image_url  text,

  location_name   text,
  is_published    boolean not null default false,
  sort_order      integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint special_events_time_order check (end_time > start_time),
  constraint special_events_payment_method check (allow_stripe or allow_cash),
  constraint special_events_promo_valid check (
    (promo_price_cents is null and promo_expires_at is null)
    or (promo_price_cents is not null and promo_expires_at is not null)
  )
);

create index if not exists special_events_published_idx
  on public.special_events (is_published, sort_order);
create index if not exists special_events_date_idx
  on public.special_events (event_date);


-- Sign-ups for special events
create table if not exists public.special_event_signups (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.special_events(id) on delete cascade,

  name              text not null,
  email             text not null,
  phone             text,

  payment_method    text not null
                      check (payment_method in ('stripe', 'cash')),
  payment_status    text not null default 'pending'
                      check (payment_status in ('pending', 'paid', 'cancelled', 'refunded')),
  amount_cents      integer not null default 0,
  currency          text not null default 'usd',

  stripe_session_id     text unique,
  stripe_payment_intent text,

  hold_expires_at   timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists special_event_signups_event_idx
  on public.special_event_signups (event_id);
create index if not exists special_event_signups_created_at_idx
  on public.special_event_signups (created_at desc);
create index if not exists special_event_signups_status_idx
  on public.special_event_signups (payment_status);


-- Capacity accounting
create or replace function public.special_event_taken_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.special_event_signups s
  where s.event_id = p_event_id
    and s.payment_status in ('pending', 'paid')
    and (s.hold_expires_at is null or s.hold_expires_at > now())
$$;


-- Atomic booking
create or replace function public.book_special_event_spot(
  p_event_id       uuid,
  p_name           text,
  p_email          text,
  p_phone          text,
  p_payment_method text,
  p_hold_minutes   integer default null
)
returns public.special_event_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event   public.special_events;
  v_taken   integer;
  v_row     public.special_event_signups;
  v_price   integer;
begin
  select * into v_event
  from public.special_events
  where id = p_event_id;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if not v_event.is_published then
    raise exception 'EVENT_NOT_AVAILABLE';
  end if;
  if v_event.event_date < (now() at time zone 'America/Santo_Domingo')::date then
    raise exception 'EVENT_DATE_PAST';
  end if;
  if p_payment_method = 'stripe' and not v_event.allow_stripe then
    raise exception 'PAYMENT_METHOD_NOT_ALLOWED';
  end if;
  if p_payment_method = 'cash' and not v_event.allow_cash then
    raise exception 'PAYMENT_METHOD_NOT_ALLOWED';
  end if;

  -- Serialize bookings for this event
  perform pg_advisory_xact_lock(
    hashtextextended('special_event:' || p_event_id::text, 0)
  );

  v_taken := public.special_event_taken_count(p_event_id);
  if v_taken >= v_event.capacity then
    raise exception 'EVENT_FULL';
  end if;

  -- Duplicate check
  if exists (
    select 1 from public.special_event_signups s
    where s.event_id = p_event_id
      and lower(s.email) = lower(p_email)
      and s.payment_status in ('pending', 'paid')
      and (s.hold_expires_at is null or s.hold_expires_at > now())
  ) then
    raise exception 'ALREADY_SIGNED_UP';
  end if;

  -- Determine price: promo if still valid, else regular
  if v_event.promo_price_cents is not null
     and v_event.promo_expires_at is not null
     and now() < v_event.promo_expires_at then
    v_price := v_event.promo_price_cents;
  else
    v_price := v_event.price_cents;
  end if;

  insert into public.special_event_signups (
    event_id, name, email, phone,
    payment_method, payment_status, amount_cents, currency, hold_expires_at
  ) values (
    p_event_id, p_name, lower(p_email), p_phone,
    p_payment_method,
    'pending',
    v_price,
    v_event.currency,
    case when p_hold_minutes is null then null
         else now() + make_interval(mins => p_hold_minutes) end
  )
  returning * into v_row;

  return v_row;
end;
$$;


-- RLS
alter table public.special_events enable row level security;
alter table public.special_event_signups enable row level security;

drop policy if exists "special_events_read_published" on public.special_events;
create policy "special_events_read_published"
  on public.special_events for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "special_events_service_role_all" on public.special_events;
create policy "special_events_service_role_all"
  on public.special_events for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "special_event_signups_service_role_all" on public.special_event_signups;
create policy "special_event_signups_service_role_all"
  on public.special_event_signups for all
  to service_role
  using (true)
  with check (true);

-- Revoke direct access to booking functions
revoke all on function public.book_special_event_spot(uuid, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.special_event_taken_count(uuid) from public, anon, authenticated;
