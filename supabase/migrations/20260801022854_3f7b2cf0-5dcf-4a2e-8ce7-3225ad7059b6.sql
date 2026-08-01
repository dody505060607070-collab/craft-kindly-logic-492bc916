CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects public read" ON public.subjects FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin());
CREATE POLICY "subjects admin manage" ON public.subjects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_phone text;

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'file',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials admin manage" ON public.materials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "materials enrolled read" ON public.materials FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    LEFT JOIN public.enrollments e ON e.course_id = l.course_id AND e.user_id = auth.uid()
    WHERE l.id = materials.lesson_id
      AND (c.is_free OR l.is_free OR (e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now())))
  )
);

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent numeric NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  max_uses integer NOT NULL DEFAULT 100 CHECK (max_uses >= 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons admin manage" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coupons authenticated validate" ON public.coupons FOR SELECT TO authenticated USING (is_active AND (expires_at IS NULL OR expires_at > now()) AND used_count < max_uses);

CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_fingerprint text NOT NULL,
  is_blocked boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices own or admin read" ON public.user_devices FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "devices own insert" ON public.user_devices FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "devices admin update delete" ON public.user_devices FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "devices admin delete" ON public.user_devices FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "lessons read" ON public.lessons;
CREATE POLICY "lessons admin direct read" ON public.lessons FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_lessons_catalog(_course_id uuid)
RETURNS TABLE(id uuid, title text, description text, duration_min integer, is_free boolean, chapter_id uuid, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.title, l.description, l.duration_min, l.is_free, l.chapter_id, l.sort_order
  FROM public.lessons l
  WHERE l.course_id = _course_id AND l.is_published = true
  ORDER BY l.sort_order, l.created_at
$$;
GRANT EXECUTE ON FUNCTION public.get_lessons_catalog(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_playable_lessons(_course_id uuid)
RETURNS TABLE(id uuid, video_url text, transcript text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.video_url, l.transcript
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  LEFT JOIN public.enrollments e ON e.course_id = l.course_id AND e.user_id = auth.uid()
  WHERE l.course_id = _course_id
    AND l.is_published = true
    AND (
      public.is_admin() OR c.is_free OR l.is_free OR
      (auth.uid() IS NOT NULL AND e.id IS NOT NULL AND (e.expires_at IS NULL OR e.expires_at > now()))
    )
$$;
GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Admin upload course covers" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage course covers" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload course videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage course videos" ON storage.objects;
DROP POLICY IF EXISTS "Students upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;
CREATE POLICY "Admin manage course covers" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'course-covers' AND public.is_admin()) WITH CHECK (bucket_id = 'course-covers' AND public.is_admin());
CREATE POLICY "Admin manage course files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'course-videos' AND public.is_admin()) WITH CHECK (bucket_id = 'course-videos' AND public.is_admin());
CREATE POLICY "Enrolled read course files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'course-videos' AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.user_id = auth.uid()
        AND e.course_id::text = (storage.foldername(name))[1]
        AND (e.expires_at IS NULL OR e.expires_at > now())
    ) OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[1] AND c.is_free
    )
  )
);
CREATE POLICY "Students upload own payment proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own or admin read payment proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "Admin delete payment proofs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-proofs' AND public.is_admin());

CREATE TRIGGER subjects_touch BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER materials_touch BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER coupons_touch BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();