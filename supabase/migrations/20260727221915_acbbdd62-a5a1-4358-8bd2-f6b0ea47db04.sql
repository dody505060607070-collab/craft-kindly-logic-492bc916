
CREATE POLICY "covers_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'course-covers');
CREATE POLICY "covers_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-covers' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "covers_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-covers' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "covers_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-covers' AND public.has_role(auth.uid(),'admin'));
