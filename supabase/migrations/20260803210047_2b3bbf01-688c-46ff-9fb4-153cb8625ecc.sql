CREATE TABLE public.course_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.course_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_plans TO authenticated;
GRANT ALL ON public.course_plans TO service_role;

ALTER TABLE public.course_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans of published courses"
ON public.course_plans FOR SELECT
USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published = true)
);

CREATE POLICY "Admins can view all plans"
ON public.course_plans FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert plans"
ON public.course_plans FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update plans"
ON public.course_plans FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete plans"
ON public.course_plans FOR DELETE TO authenticated
USING (public.is_admin());

CREATE TRIGGER course_plans_touch_updated_at
BEFORE UPDATE ON public.course_plans
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS duration_days integer;

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

  UPDATE public.payments SET status = _status, updated_at = now() WHERE id = _payment_id;

  IF _status = 'approved' AND _p.course_id IS NOT NULL THEN
    _days := COALESCE(_p.duration_days, CASE WHEN _p.plan = 'year' THEN 365 ELSE 30 END);

    INSERT INTO public.enrollments (user_id, course_id, expires_at)
    VALUES (_p.user_id, _p.course_id, now() + make_interval(days => _days))
    ON CONFLICT (user_id, course_id) DO UPDATE
      SET expires_at = GREATEST(COALESCE(public.enrollments.expires_at, now()), now()) + make_interval(days => _days);
  END IF;
END;
$$;