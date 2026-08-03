ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'month',
  duration_days integer NOT NULL DEFAULT 30,
  note text,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage access codes" ON public.access_codes;
CREATE POLICY "admins manage access codes" ON public.access_codes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS access_codes_touch ON public.access_codes;
CREATE TRIGGER access_codes_touch BEFORE UPDATE ON public.access_codes
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE OR REPLACE FUNCTION public.generate_access_codes(_course_id uuid, _count integer, _plan text DEFAULT 'month', _note text DEFAULT NULL)
RETURNS TABLE(code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _i integer;
  _code text;
  _days integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'للأدمن فقط';
  END IF;
  IF _count IS NULL OR _count < 1 OR _count > 200 THEN
    RAISE EXCEPTION 'العدد لازم يكون بين 1 و 200';
  END IF;
  IF _plan NOT IN ('month','year','lifetime') THEN
    RAISE EXCEPTION 'المدة غير صالحة';
  END IF;
  _days := CASE _plan WHEN 'year' THEN 365 WHEN 'lifetime' THEN 0 ELSE 30 END;

  FOR _i IN 1.._count LOOP
    LOOP
      _code := upper(substr(replace(encode(gen_random_bytes(9), 'base64'), '/', 'A'), 1, 10));
      _code := regexp_replace(_code, '[^A-Z0-9]', 'X', 'g');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.access_codes ac WHERE ac.code = _code);
    END LOOP;
    INSERT INTO public.access_codes (code, course_id, plan, duration_days, note)
    VALUES (_code, _course_id, _plan, _days, _note);
    RETURN QUERY SELECT _code;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS TABLE(course_id uuid, plan text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.access_codes%ROWTYPE;
  _user uuid := auth.uid();
  _expires timestamptz;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'سجّل دخولك أولاً';
  END IF;

  SELECT * INTO _row FROM public.access_codes
  WHERE code = upper(btrim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الكود غير صحيح';
  END IF;
  IF _row.used_by IS NOT NULL THEN
    RAISE EXCEPTION 'الكود مستخدم بالفعل';
  END IF;

  _expires := CASE WHEN _row.duration_days > 0 THEN now() + make_interval(days => _row.duration_days) ELSE NULL END;

  INSERT INTO public.enrollments (user_id, course_id, progress, expires_at)
  VALUES (_user, _row.course_id, 0, _expires)
  ON CONFLICT (user_id, course_id) DO UPDATE
  SET expires_at = CASE
    WHEN _expires IS NULL THEN NULL
    WHEN public.enrollments.expires_at IS NULL THEN NULL
    ELSE GREATEST(public.enrollments.expires_at, now()) + make_interval(days => _row.duration_days)
  END;

  UPDATE public.access_codes
  SET used_by = _user, used_at = now()
  WHERE id = _row.id;

  RETURN QUERY SELECT _row.course_id, _row.plan, _expires;
END
$$;

REVOKE ALL ON FUNCTION public.generate_access_codes(uuid, integer, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_access_codes(uuid, integer, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;