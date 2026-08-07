-- Update approve_payment to handle 'paid' status and correct duration for 'term'
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p record;
  _days integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF _p IS NULL THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  -- Update status.
  UPDATE public.payments SET status = _status, updated_at = now() WHERE id = _payment_id;

  IF (_status = 'paid' OR _status = 'approved') AND _p.course_id IS NOT NULL THEN
    _days := COALESCE(_p.duration_days, 
      CASE 
        WHEN _p.plan = 'year' THEN 365 
        WHEN _p.plan = 'term' THEN 120
        ELSE 30 
      END);

    INSERT INTO public.enrollments (user_id, course_id, expires_at)
    VALUES (_p.user_id, _p.course_id, now() + make_interval(days => _days))
    ON CONFLICT (user_id, course_id) DO UPDATE
      SET expires_at = GREATEST(COALESCE(public.enrollments.expires_at, now()), now()) + make_interval(days => _days);
  END IF;
END;
$$;