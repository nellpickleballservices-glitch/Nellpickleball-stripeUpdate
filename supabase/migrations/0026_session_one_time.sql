-- One-time play sessions.
--
-- Until now every row in `play_sessions` was necessarily a recurring template:
-- days_of_week + weeks_ahead were mandatory, so publishing a single game meant
-- picking a weekday and a horizon and then deleting the extra dates it spawned.
--
-- A row is now one of two shapes:
--   is_recurring = true   -> days_of_week + weeks_ahead project forward as before
--   is_recurring = false  -> specific_date is the one and only date it runs
--
-- Existing rows are all recurring, which is exactly what the defaults give them.

alter table public.play_sessions
  add column if not exists is_recurring  boolean not null default true,
  add column if not exists specific_date date;

-- weeks_ahead is meaningless for a one-time session, so it stops being required.
-- The recurrence constraint below is what guarantees it is present when it matters.
alter table public.play_sessions
  alter column weeks_ahead drop not null;

-- Each shape must carry the fields it actually needs, and only those. Without
-- this a half-filled row would reach generateOccurrences() and silently publish
-- nothing, which is far harder to debug than a rejected insert.
alter table public.play_sessions
  drop constraint if exists play_sessions_recurrence;
alter table public.play_sessions
  add constraint play_sessions_recurrence check (
    (is_recurring
      and coalesce(array_length(days_of_week, 1), 0) >= 1
      and weeks_ahead is not null
      and specific_date is null)
    or
    (not is_recurring
      and specific_date is not null)
  );


-- Booking guard: a one-time session has no weekday pattern to validate against,
-- so the dow check would reject its own date. Branch on the shape instead.
--
-- This is the same function as 0025 with only the date-validity block changed;
-- it is replaced wholesale because Postgres has no way to patch a function body.
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

  -- Rejects dates that aren't real occurrences of this session, so a
  -- hand-crafted request can't book one.
  if v_session.is_recurring then
    -- 0 = Sunday, matching days_of_week.
    if extract(dow from p_date)::smallint <> all(v_session.days_of_week) then
      raise exception 'SESSION_DATE_INVALID';
    end if;
  else
    if p_date <> v_session.specific_date then
      raise exception 'SESSION_DATE_INVALID';
    end if;
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

revoke all on function public.book_session_spot(uuid, date, text, text, text, text, integer) from public, anon, authenticated;
