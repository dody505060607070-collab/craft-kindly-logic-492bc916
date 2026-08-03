CREATE OR REPLACE FUNCTION public.generate_access_codes(_course_id uuid, _count integer, _plan text DEFAULT 'month'::text, _note text DEFAULT NULL::text, _duration_days integer DEFAULT NULL::integer)
 RETURNS TABLE(code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _i integer;
  _j integer;
  _code text;
  _days integer;
  _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'للأدمن فقط';
  END IF;
  IF _count IS NULL OR _count < 1 OR _count > 200 THEN
    RAISE EXCEPTION 'العدد لازم يكون بين 1 و 200';
  END IF;
  IF _plan IS NULL OR btrim(_plan) = '' THEN
    RAISE EXCEPTION 'اكتب اسم المدة';
  END IF;

  IF _duration_days IS NOT NULL THEN
    _days := _duration_days;
  ELSE
    _days := CASE lower(btrim(_plan))
      WHEN 'year' THEN 365
      WHEN 'lifetime' THEN 0
      WHEN 'term' THEN 120
      WHEN 'month' THEN 30
      ELSE NULL
    END;
    IF _days IS NULL THEN
      SELECT cp.duration_days INTO _days
      FROM public.course_plans cp
      WHERE cp.course_id = _course_id AND cp.name = _plan
      ORDER BY cp.sort_order
      LIMIT 1;
    END IF;
    IF _days IS NULL THEN
      RAISE EXCEPTION 'حدد عدد أيام المدة';
    END IF;
  END IF;

  IF _days < 0 OR _days > 3650 THEN
    RAISE EXCEPTION 'عدد الأيام لازم يكون بين 0 و 3650';
  END IF;

  FOR _i IN 1.._count LOOP
    LOOP
      _code := '';
      FOR _j IN 1..10 LOOP
        _code := _code || substr(_alphabet, 1 + floor(random() * length(_alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.access_codes ac WHERE ac.code = _code);
    END LOOP;
    INSERT INTO public.access_codes (code, course_id, plan, duration_days, note)
    VALUES (_code, _course_id, _plan, _days, _note);
    RETURN QUERY SELECT _code;
  END LOOP;
END
$function$;

REVOKE ALL ON FUNCTION public.generate_access_codes(uuid, integer, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_access_codes(uuid, integer, text, text, integer) TO authenticated;