CREATE OR REPLACE FUNCTION public.generate_access_codes(_course_id uuid, _count integer, _plan text DEFAULT 'month'::text, _note text DEFAULT NULL::text)
 RETURNS TABLE(code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _i integer;
  _code text;
  _days integer;
  _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _j integer;
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