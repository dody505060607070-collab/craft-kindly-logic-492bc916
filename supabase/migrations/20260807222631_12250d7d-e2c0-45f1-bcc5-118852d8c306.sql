-- Fix ambiguous column reference in redeem_access_code
CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_code_row record;
  v_interval interval;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'سجّل دخولك أولاً';
  END IF;

  SELECT * INTO v_code_row
  FROM public.access_codes
  WHERE code = _code;

  IF v_code_row.id IS NULL THEN
    RAISE EXCEPTION 'الكود غير صحيح';
  END IF;

  IF v_code_row.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'هذا الكود تم استخدامه مسبقاً';
  END IF;

  -- Use 100 years for lifetime (duration_days = 0)
  IF v_code_row.duration_days = 0 THEN
    v_interval := '100 years'::interval;
  ELSE
    v_interval := (v_code_row.duration_days || ' days')::interval;
  END IF;

  -- Use explicit aliases to avoid "ambiguous column" errors
  IF EXISTS (
    SELECT 1 FROM public.enrollments enc
    WHERE enc.user_id = v_user_id 
    AND enc.course_id = v_code_row.course_id
    AND (enc.expires_at IS NULL OR enc.expires_at > now())
  ) THEN
    UPDATE public.enrollments
    SET expires_at = now() + v_interval,
        updated_at = now()
    WHERE user_id = v_user_id AND course_id = v_code_row.course_id;
  ELSE
    INSERT INTO public.enrollments (user_id, course_id, expires_at)
    VALUES (v_user_id, v_code_row.course_id, now() + v_interval);
  END IF;

  UPDATE public.access_codes
  SET used_at = now(),
      used_by = v_user_id,
      updated_at = now()
  WHERE id = v_code_row.id;
END;
$function$;
