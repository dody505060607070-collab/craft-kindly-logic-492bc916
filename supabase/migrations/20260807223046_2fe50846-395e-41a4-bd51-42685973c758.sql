-- Final fix for redeem_access_code to ensure it's robust and works for all plans
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
  -- 1. Check Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'سجّل دخولك أولاً';
  END IF;

  -- 2. Find and Lock Code Row
  SELECT * INTO v_code_row
  FROM public.access_codes
  WHERE code = trim(upper(_code))
  FOR UPDATE; -- Lock for update to prevent race conditions

  -- 3. Validation
  IF v_code_row.id IS NULL THEN
    RAISE EXCEPTION 'الكود غير صحيح';
  END IF;

  IF v_code_row.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'هذا الكود تم استخدامه مسبقاً';
  END IF;

  -- 4. Calculate Interval
  -- duration_days = 0 means lifetime
  IF v_code_row.duration_days = 0 THEN
    v_interval := '100 years'::interval;
  ELSE
    v_interval := (v_code_row.duration_days || ' days')::interval;
  END IF;

  -- 5. UPSERT Enrollment
  -- We use explicit alias 'en' to avoid any 'id' or 'user_id' ambiguity
  INSERT INTO public.enrollments (user_id, course_id, expires_at)
  VALUES (v_user_id, v_code_row.course_id, now() + v_interval)
  ON CONFLICT (user_id, course_id) 
  DO UPDATE SET 
    expires_at = EXCLUDED.expires_at,
    updated_at = now();

  -- 6. Mark Code as Used
  UPDATE public.access_codes
  SET used_at = now(),
      used_by = v_user_id,
      updated_at = now()
  WHERE id = v_code_row.id;
  
END;
$function$;
