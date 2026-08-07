
-- Drop and recreate get_playable_lessons with simplified and fixed logic
DROP FUNCTION IF EXISTS public.get_playable_lessons(uuid);

CREATE OR REPLACE FUNCTION public.get_playable_lessons(_course_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  video_url text,
  is_free boolean,
  max_views integer,
  current_views integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _is_enrolled boolean;
  _is_course_free boolean;
BEGIN
  -- Check if user is admin
  _is_admin := exists (
    select 1 from user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  );

  -- Check if course is free
  _is_course_free := exists (
    select 1 from courses 
    where id = _course_id 
    and (is_free = true or price = 0)
  );

  -- Check if user is enrolled
  _is_enrolled := exists (
    select 1 from enrollments 
    where user_id = auth.uid() 
    and course_id = _course_id
    and (expires_at is null or expires_at > now())
  );

  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.video_url,
    l.is_free,
    COALESCE(l.max_views, 0) as max_views,
    CAST((SELECT count(*) FROM video_views vv WHERE vv.lesson_id = l.id AND vv.user_id = auth.uid()) AS integer) as current_views
  FROM lessons l
  WHERE l.course_id = _course_id
    AND l.is_published = true
    AND (
      _is_admin 
      OR _is_enrolled 
      OR _is_course_free 
      OR l.is_free = true
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO service_role;
