-- Add is_local flag to profiles for local pricing.
--
-- Staff screen visitors at first visit and toggle this flag in the admin panel.
-- Locals get the base price; non-locals pay base + tourist_surcharge_pct.

-- 1. Add is_local column (default false — everyone starts as non-local)
ALTER TABLE profiles ADD COLUMN is_local BOOLEAN NOT NULL DEFAULT false;

-- 2. Prevent users from self-modifying is_local (same pattern as country)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND country IS NOT DISTINCT FROM (SELECT p.country FROM profiles p WHERE p.id = (SELECT auth.uid()))
    AND is_local IS NOT DISTINCT FROM (SELECT p.is_local FROM profiles p WHERE p.id = (SELECT auth.uid()))
  );

-- 3. Recreate admin_users_view with is_local
DROP VIEW IF EXISTS admin_users_view;
CREATE VIEW admin_users_view AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.country,
  p.is_local,
  p.created_at,
  u.email,
  u.last_sign_in_at,
  u.banned_until,
  u.raw_app_meta_data->>'role' AS role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

REVOKE ALL ON admin_users_view FROM anon, authenticated;
GRANT SELECT ON admin_users_view TO service_role;

-- 4. Update book_session_spot to apply tourist surcharge for non-locals.
--    Looks up the booker's email in profiles; if they have is_local = true,
--    they pay the base price. Otherwise, tourist_surcharge_pct is added.
CREATE OR REPLACE FUNCTION public.book_session_spot(
  p_session_id     uuid,
  p_date           date,
  p_name           text,
  p_email          text,
  p_phone          text,
  p_payment_method text,
  p_hold_minutes   integer default null
)
RETURNS public.session_signups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session       public.play_sessions;
  v_taken         integer;
  v_row           public.session_signups;
  v_is_local      boolean;
  v_surcharge_pct integer;
  v_final_price   integer;
BEGIN
  SELECT * INTO v_session
  FROM public.play_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;
  IF NOT v_session.is_published THEN
    RAISE EXCEPTION 'SESSION_NOT_AVAILABLE';
  END IF;
  IF p_date = ANY(v_session.blackout_dates) THEN
    RAISE EXCEPTION 'SESSION_DATE_CANCELLED';
  END IF;

  IF v_session.is_recurring THEN
    IF extract(dow FROM p_date)::smallint <> ALL(v_session.days_of_week) THEN
      RAISE EXCEPTION 'SESSION_DATE_INVALID';
    END IF;
  ELSE
    IF p_date <> v_session.specific_date THEN
      RAISE EXCEPTION 'SESSION_DATE_INVALID';
    END IF;
  END IF;

  IF p_date < (now() AT TIME ZONE 'America/Santo_Domingo')::date THEN
    RAISE EXCEPTION 'SESSION_DATE_PAST';
  END IF;
  IF p_payment_method = 'stripe' AND NOT v_session.allow_stripe THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_ALLOWED';
  END IF;
  IF p_payment_method = 'cash' AND NOT v_session.allow_cash THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_NOT_ALLOWED';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_session_id::text || ':' || p_date::text, 0)
  );

  v_taken := public.session_taken_count(p_session_id, p_date);
  IF v_taken >= v_session.capacity THEN
    RAISE EXCEPTION 'SESSION_FULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.session_signups s
    WHERE s.session_id = p_session_id
      AND s.session_date = p_date
      AND lower(s.email) = lower(p_email)
      AND s.payment_status IN ('pending', 'paid')
      AND (s.hold_expires_at IS NULL OR s.hold_expires_at > now())
  ) THEN
    RAISE EXCEPTION 'ALREADY_SIGNED_UP';
  END IF;

  -- Determine if booker is a verified local
  SELECT p.is_local INTO v_is_local
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(p_email);

  v_is_local := coalesce(v_is_local, false);

  -- Calculate final price: locals pay base, non-locals pay base + surcharge
  IF v_is_local THEN
    v_final_price := v_session.price_cents;
  ELSE
    SELECT coalesce((value)::int, 0) INTO v_surcharge_pct
    FROM public.app_config
    WHERE key = 'tourist_surcharge_pct';

    v_surcharge_pct := coalesce(v_surcharge_pct, 0);
    v_final_price := v_session.price_cents + (v_session.price_cents * v_surcharge_pct / 100);
  END IF;

  INSERT INTO public.session_signups (
    session_id, session_date, name, email, phone,
    payment_method, payment_status, amount_cents, currency, hold_expires_at
  ) VALUES (
    p_session_id, p_date, p_name, lower(p_email), p_phone,
    p_payment_method,
    'pending',
    v_final_price,
    v_session.currency,
    CASE WHEN p_hold_minutes IS NULL THEN NULL
         ELSE now() + make_interval(mins => p_hold_minutes) END
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.book_session_spot(uuid, date, text, text, text, text, integer) FROM public, anon, authenticated;
