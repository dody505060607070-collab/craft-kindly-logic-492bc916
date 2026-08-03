CREATE OR REPLACE FUNCTION public.can_read_course_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      LEFT JOIN public.enrollments e ON e.course_id = l.course_id AND e.user_id = auth.uid()
      WHERE l.video_url = 'storage:' || _name
        AND l.is_published
        AND (c.is_free OR l.is_free OR (e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now())))
    )
    OR EXISTS (
      SELECT 1 FROM public.materials m
      JOIN public.lessons l ON l.id = m.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      LEFT JOIN public.enrollments e ON e.course_id = l.course_id AND e.user_id = auth.uid()
      WHERE (m.file_path = _name OR m.file_path = 'storage:' || _name)
        AND (c.is_free OR l.is_free OR (e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now())))
    )
$$;

GRANT EXECUTE ON FUNCTION public.can_read_course_object(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Enrolled read course files" ON storage.objects;
DROP POLICY IF EXISTS "course_videos_enrolled_read" ON storage.objects;

CREATE POLICY "course_videos_read_allowed" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'course-videos' AND public.can_read_course_object(name));