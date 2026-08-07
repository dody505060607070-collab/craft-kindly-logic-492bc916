-- 1. Fix Student Deletion (Cascading cleanup)
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey, ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_user_id_fkey, ADD CONSTRAINT assignment_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey, ADD CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey, ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Fix Course Locking (RLS Policy check)
DROP POLICY IF EXISTS "Students can view lessons of enrolled courses" ON public.lessons;
CREATE POLICY "Students can view lessons of enrolled courses"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  is_free = true OR 
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE course_id = lessons.course_id 
    AND user_id = auth.uid() 
    AND (expires_at IS NULL OR expires_at > now())
  ) OR
  public.has_role(auth.uid(), 'admin')
);

-- Ensure materials are also protected
DROP POLICY IF EXISTS "Students can view materials of enrolled courses" ON public.materials;
CREATE POLICY "Students can view materials of enrolled courses"
ON public.materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons 
    WHERE id = materials.lesson_id 
    AND (
      is_free = true OR 
      EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE course_id = lessons.course_id 
        AND user_id = auth.uid() 
        AND (expires_at IS NULL OR expires_at > now())
      )
    )
  ) OR
  public.has_role(auth.uid(), 'admin')
);

GRANT SELECT, DELETE ON public.profiles TO authenticated;
GRANT DELETE ON auth.users TO service_role;
