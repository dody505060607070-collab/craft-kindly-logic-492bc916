-- 1) Gate assessment question files by enrollment
CREATE OR REPLACE FUNCTION public.can_read_assessment_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.assignments a
      LEFT JOIN public.courses c ON c.id = a.course_id
      LEFT JOIN public.lessons l ON l.id = a.lesson_id
      LEFT JOIN public.enrollments e ON e.course_id = a.course_id AND e.user_id = auth.uid()
      WHERE (a.questions_file_url = _name OR a.questions_file_url = 'storage:' || _name)
        AND a.is_published
        AND (
          COALESCE(c.is_free, false)
          OR COALESCE(l.is_free, false)
          OR (e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now()))
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.quizzes q
      LEFT JOIN public.courses c ON c.id = q.course_id
      LEFT JOIN public.lessons l ON l.id = q.lesson_id
      LEFT JOIN public.enrollments e ON e.course_id = q.course_id AND e.user_id = auth.uid()
      WHERE (q.questions_file_url = _name OR q.questions_file_url = 'storage:' || _name)
        AND q.is_published
        AND (
          COALESCE(c.is_free, false)
          OR COALESCE(l.is_free, false)
          OR (e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now()))
        )
    )
$$;

DROP POLICY IF EXISTS "students read assessment question files" ON storage.objects;
CREATE POLICY "students read assessment question files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assessment-files'
  AND name LIKE 'questions/%'
  AND public.can_read_assessment_object(name)
);

-- 2) Stop coupon code enumeration
DROP POLICY IF EXISTS "coupons authenticated validate" ON public.coupons;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS TABLE(code text, discount_percent numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.code, c.discount_percent
  FROM public.coupons c
  WHERE upper(trim(c.code)) = upper(trim(_code))
    AND c.is_active
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_uses = 0 OR c.used_count < c.max_uses)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO authenticated;