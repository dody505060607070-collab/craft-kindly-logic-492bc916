DROP POLICY IF EXISTS "admins manage assessment files" ON storage.objects;
CREATE POLICY "admins manage assessment files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'assessment-files' AND public.is_admin())
WITH CHECK (bucket_id = 'assessment-files' AND public.is_admin());

DROP POLICY IF EXISTS "students read assessment question files" ON storage.objects;
CREATE POLICY "students read assessment question files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assessment-files' AND name LIKE 'questions/%');