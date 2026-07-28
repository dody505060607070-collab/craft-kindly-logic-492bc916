
-- 1) Storage policies
-- payment-proofs: user can upload/read their own (path prefix = user id); admin full
DROP POLICY IF EXISTS "payment_proofs_own_read" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_own_insert" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_admin_all" ON storage.objects;
CREATE POLICY "payment_proofs_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "payment_proofs_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "payment_proofs_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'));

-- course-covers: public read, admin write
DROP POLICY IF EXISTS "course_covers_public_read" ON storage.objects;
DROP POLICY IF EXISTS "course_covers_admin_write" ON storage.objects;
CREATE POLICY "course_covers_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'course-covers');
CREATE POLICY "course_covers_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-covers' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'course-covers' AND public.has_role(auth.uid(),'admin'));

-- course-videos: enrolled or admin can read; only admin writes
DROP POLICY IF EXISTS "course_videos_enrolled_read" ON storage.objects;
DROP POLICY IF EXISTS "course_videos_admin_write" ON storage.objects;
CREATE POLICY "course_videos_enrolled_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-videos' AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid())));
CREATE POLICY "course_videos_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(),'admin'));

-- 2) quiz_questions: hide correct answers from non-admins via column privileges
REVOKE SELECT ON public.quiz_questions FROM authenticated, anon;
GRANT SELECT (id, quiz_id, question, options, points, sort_order, prompt) ON public.quiz_questions TO authenticated;

-- 3) variant_events: enforce user_id matches auth.uid() when authenticated
DROP POLICY IF EXISTS "ve insert" ON public.variant_events;
CREATE POLICY "ve_insert_safe" ON public.variant_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );
