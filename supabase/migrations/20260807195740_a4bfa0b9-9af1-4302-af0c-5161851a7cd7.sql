
-- Allow anyone (including anon) to read lessons and materials for free courses or free lessons
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT SELECT ON public.materials TO anon, authenticated;

-- Update lessons policy to include course is_free
DROP POLICY IF EXISTS "Students can view lessons of enrolled courses" ON public.lessons;
CREATE POLICY "Students can view lessons of enrolled courses"
ON public.lessons
FOR SELECT
TO anon, authenticated
USING (
  is_free = true OR 
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id AND c.is_free = true
  ) OR
  (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = lessons.course_id 
      AND e.user_id = auth.uid()
      AND (e.expires_at IS NULL OR e.expires_at > now())
    )
  ) OR
  public.is_admin()
);

-- Update materials policy to include course is_free
DROP POLICY IF EXISTS "materials enrolled read" ON public.materials;
CREATE POLICY "materials enrolled read"
ON public.materials
FOR SELECT
TO anon, authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    LEFT JOIN public.enrollments e ON e.course_id = l.course_id AND e.user_id = auth.uid()
    WHERE l.id = materials.lesson_id
    AND (
      l.is_free = true OR 
      c.is_free = true OR 
      (auth.uid() IS NOT NULL AND e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now()))
    )
  )
);

-- Ensure get_playable_lessons handles anon users correctly
CREATE OR REPLACE FUNCTION public.get_playable_lessons(_course_id uuid)
RETURNS TABLE (id uuid, video_url text, transcript text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.video_url, l.transcript
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  LEFT JOIN public.enrollments e ON e.course_id = l.course_id AND e.user_id = auth.uid()
  WHERE l.course_id = _course_id
    AND l.is_published = true
    AND (
      public.is_admin() OR 
      c.is_free OR 
      l.is_free OR 
      (auth.uid() IS NOT NULL AND e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now()))
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO anon, authenticated;
