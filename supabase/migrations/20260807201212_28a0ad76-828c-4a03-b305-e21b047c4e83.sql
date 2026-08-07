-- 1. Redefine lesson visibility logic to properly gate paid content
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can do everything on lessons" ON public.lessons;

-- Admins see everything
CREATE POLICY "Admins can do everything on lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Students/Anon can only see lessons if:
-- a) The course is free OR the lesson itself is free
-- b) The student is enrolled in the course
CREATE POLICY "Authenticated users and anon can view appropriate lessons"
ON public.lessons
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id
    AND (c.is_free IS TRUE OR c.price = 0)
  )
  OR is_free IS TRUE
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = course_id
    AND e.user_id = auth.uid()
    AND (e.expires_at IS NULL OR e.expires_at > now())
  )
);

-- 2. Similar logic for materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can do everything on materials" ON public.materials;

CREATE POLICY "Admins can do everything on materials"
ON public.materials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enrolled or free students can view materials"
ON public.materials
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id
    AND (
      c.is_free IS TRUE 
      OR c.price = 0 
      OR l.is_free IS TRUE
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = c.id
        AND e.user_id = auth.uid()
        AND (e.expires_at IS NULL OR e.expires_at > now())
      )
    )
  )
);