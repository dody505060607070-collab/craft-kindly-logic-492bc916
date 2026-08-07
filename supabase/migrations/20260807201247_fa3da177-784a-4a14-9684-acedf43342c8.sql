-- Disable and Re-enable RLS to clear any ghost state
ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policies for this table
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'lessons' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.lessons', pol.policyname);
    END LOOP;
END $$;

-- 1. Admin Policy
CREATE POLICY "admin_all" 
ON public.lessons FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Strictly gated SELECT policy for Students and Guests
CREATE POLICY "gated_select" 
ON public.lessons FOR SELECT 
TO anon, authenticated 
USING (
  -- Lesson is free
  is_free IS TRUE
  OR 
  -- Course is free
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = lessons.course_id 
    AND (is_free IS TRUE OR price = 0)
  )
  OR
  -- User is enrolled
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE course_id = lessons.course_id 
    AND user_id = auth.uid() 
    AND (expires_at IS NULL OR expires_at > now())
  )
);

-- Repeat for materials to be safe
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'materials' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.materials', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "admin_all_materials" 
ON public.materials FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gated_select_materials" 
ON public.materials FOR SELECT 
TO anon, authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = materials.lesson_id
    AND (
      l.is_free IS TRUE
      OR c.is_free IS TRUE
      OR c.price = 0
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = c.id
        AND e.user_id = auth.uid()
        AND (e.expires_at IS NULL OR e.expires_at > now())
      )
    )
  )
);