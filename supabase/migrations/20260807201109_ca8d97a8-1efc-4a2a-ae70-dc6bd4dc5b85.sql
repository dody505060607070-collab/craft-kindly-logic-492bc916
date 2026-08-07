CREATE OR REPLACE FUNCTION public.get_playable_lessons(_course_id uuid)
 RETURNS TABLE(id uuid, video_url text, transcript text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _is_admin boolean := false;
  _is_enrolled boolean := false;
  _course_is_free boolean := false;
BEGIN
  _user_id := auth.uid();
  
  -- Check if user is admin
  IF _user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'admin'
    ) INTO _is_admin;
  END IF;

  -- Check if course is free
  SELECT (is_free = true OR price = 0) INTO _course_is_free 
  FROM public.courses 
  WHERE courses.id = _course_id;

  -- Check enrollment if not admin and not free
  IF NOT _is_admin AND NOT _course_is_free AND _user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE course_id = _course_id AND user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
    ) INTO _is_enrolled;
  END IF;

  RETURN QUERY
  SELECT l.id, l.video_url, l.transcript
  FROM public.lessons l
  WHERE l.course_id = _course_id
  AND (
    _is_admin -- Admin sees all
    OR _course_is_free -- Everyone sees free course lessons
    OR l.is_free = true -- Everyone sees specifically free lessons
    OR _is_enrolled -- Enrolled users see all
  );
END;
$function$;