-- Validate a special-event booking without inserting a signup row.
-- Returns the effective price so the caller can create a Stripe checkout
-- session, deferring the actual signup to the payment webhook.

create or replace function public.validate_special_event_booking(
  p_event_id       uuid,
  p_email          text,
  p_payment_method text
)
returns table (amount_cents integer, currency text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event   public.special_events;
  v_taken   integer;
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

  -- Duplicate check — only against paid signups for Stripe
  -- (pending holds no longer exist for Stripe flow)
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

  return query select v_price, v_event.currency;
end;
$$;

-- Only callable by service_role (via supabaseAdmin)
revoke all on function public.validate_special_event_booking(uuid, text, text) from public, anon, authenticated;
