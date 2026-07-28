CREATE TYPE public.app_role AS ENUM ('admin','teacher','student','parent');
CREATE TYPE public.question_type AS ENUM ('mcq','truefalse','essay');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded');
CREATE TYPE public.live_status AS ENUM ('scheduled','live','ended');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT UNIQUE, parent_phone TEXT, avatar_url TEXT, grade TEXT, bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true, points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_admin_delete ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_phone TEXT;
BEGIN
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  INSERT INTO public.profiles (id, full_name, phone, grade)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NULLIF(v_phone,''), NEW.raw_user_meta_data->>'grade')
  ON CONFLICT (id) DO NOTHING;
  IF v_phone = '01016177688' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''),'student')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, icon TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_public_read ON public.subjects FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY subjects_admin_write ON public.subjects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT, cover_url TEXT, grade TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_public_read ON public.courses FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY courses_admin_read ON public.courses FOR SELECT TO authenticated USING (public.is_admin() OR teacher_id = auth.uid());
CREATE POLICY courses_manage ON public.courses FOR ALL TO authenticated USING (public.is_admin() OR teacher_id = auth.uid()) WITH CHECK (public.is_admin() OR teacher_id = auth.uid());
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY chapters_read ON public.chapters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY chapters_manage ON public.chapters FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT, video_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  transcript TEXT, summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY lessons_read ON public.lessons FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY lessons_admin_read ON public.lessons FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY lessons_manage ON public.lessons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enroll_read ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY enroll_insert ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY enroll_update ON public.enrollments FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY enroll_delete ON public.enrollments FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, file_url TEXT NOT NULL, file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY materials_read ON public.materials FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid()
      AND e.course_id = COALESCE(public.materials.course_id, (SELECT l.course_id FROM public.lessons l WHERE l.id = public.materials.lesson_id))
  )
);
CREATE POLICY materials_manage ON public.materials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY progress_own ON public.lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  pass_score INTEGER NOT NULL DEFAULT 60,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quizzes_read ON public.quizzes FOR SELECT TO authenticated USING (is_published);
CREATE POLICY quizzes_admin_read ON public.quizzes FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY quiz_manage ON public.quizzes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type public.question_type NOT NULL DEFAULT 'mcq',
  prompt TEXT NOT NULL, choices JSONB, correct_answer JSONB,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY qq_read ON public.quiz_questions FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.quizzes q JOIN public.enrollments e ON e.user_id = auth.uid()
    WHERE q.id = public.quiz_questions.quiz_id
      AND e.course_id = COALESCE(q.course_id, (SELECT l.course_id FROM public.lessons l WHERE l.id = q.lesson_id))
  )
);
CREATE POLICY qq_manage ON public.quiz_questions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY attempts_own ON public.quiz_attempts FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL, instructions TEXT, model_answer TEXT,
  max_score INTEGER NOT NULL DEFAULT 10, due_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignments_read ON public.assignments FOR SELECT TO authenticated USING (is_published);
CREATE POLICY assignments_admin_read ON public.assignments FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY assign_manage ON public.assignments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT, file_url TEXT, score NUMERIC(5,2), ai_feedback TEXT,
  graded_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subs_own ON public.assignment_submissions FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL, description TEXT, stream_url TEXT, recording_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.live_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY live_read ON public.live_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY live_manage ON public.live_sessions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.live_messages TO authenticated;
GRANT ALL ON public.live_messages TO service_role;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY livemsg_read ON public.live_messages FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    LEFT JOIN public.enrollments e ON e.user_id = auth.uid() AND e.course_id = ls.course_id
    WHERE ls.id = public.live_messages.session_id AND (ls.course_id IS NULL OR e.id IS NOT NULL)
  )
);
CREATE POLICY livemsg_insert ON public.live_messages FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    LEFT JOIN public.enrollments e ON e.user_id = auth.uid() AND e.course_id = ls.course_id
    WHERE ls.id = public.live_messages.session_id AND (ls.course_id IS NULL OR e.id IS NOT NULL)
  ))
);
CREATE POLICY livemsg_delete ON public.live_messages FOR DELETE TO authenticated USING (public.is_admin());
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY coupons_read ON public.coupons FOR SELECT TO authenticated USING (is_active OR public.is_admin());
CREATE POLICY coupons_manage ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'vodafone_cash',
  reference TEXT, coupon_code TEXT, proof_url TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pay_read ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY pay_insert ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY pay_update ON public.payments FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY pay_delete ON public.payments FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY msg_read ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin());
CREATE POLICY msg_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY msg_update ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid() OR public.is_admin()) WITH CHECK (recipient_id = auth.uid() OR public.is_admin());
CREATE POLICY msg_delete ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid() OR public.is_admin());
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ann_read ON public.announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ann_manage ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_own ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL, device_name TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY dev_own ON public.user_devices FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  serial TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6),'hex'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY cert_own ON public.certificates FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY cert_admin_write ON public.certificates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Storage policies (buckets already created via storage_create_bucket)
CREATE POLICY pp_user_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY pp_user_read_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY pp_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_admin())
  WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin());
CREATE POLICY cv_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-videos' AND public.is_admin())
  WITH CHECK (bucket_id = 'course-videos' AND public.is_admin());

-- SEED
INSERT INTO public.subjects (id, name, description, icon, is_published, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'البرمجة', 'أساسيات ولغات البرمجة الحديثة', '💻', true, 1),
  ('22222222-2222-2222-2222-222222222222', 'الذكاء الاصطناعي', 'تعلم الآلة والشبكات العصبية', '🤖', true, 2);

INSERT INTO public.courses (id, subject_id, title, description, grade, price, is_free, is_published, sort_order) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'أساسيات Python من الصفر', 'مقدمة كاملة في لغة Python للمبتدئين مع مشاريع تطبيقية.', 'الصف الأول الثانوي', 250, false, true, 1),
  ('aaaaaaaa-0001-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'تطوير مواقع الويب - HTML/CSS/JS', 'ابنِ أول موقع ويب حقيقي بأدوات المطوّر.', 'الصف الثاني الثانوي', 300, false, true, 2),
  ('aaaaaaaa-0001-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'مقدمة في الذكاء الاصطناعي', 'مفاهيم الذكاء الاصطناعي وتعلم الآلة العملية.', 'الصف الثالث الثانوي', 350, false, true, 3),
  ('aaaaaaaa-0001-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'كورس مجاني: أول خطوة في البرمجة', 'ابدأ بدون تكلفة وشوف هل البرمجة تناسبك.', 'الكل', 0, true, true, 4);

INSERT INTO public.chapters (id, course_id, title, sort_order) VALUES
  ('bbbbbbbb-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 'الفصل الأول: البداية مع Python', 1),
  ('bbbbbbbb-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001', 'الفصل الثاني: المتغيرات والحلقات', 2),
  ('bbbbbbbb-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000002', 'الفصل الأول: HTML الأساسي', 1),
  ('bbbbbbbb-0001-0000-0000-000000000004', 'aaaaaaaa-0001-0000-0000-000000000003', 'الفصل الأول: مقدمة في الذكاء الاصطناعي', 1),
  ('bbbbbbbb-0001-0000-0000-000000000005', 'aaaaaaaa-0001-0000-0000-000000000004', 'الفصل الأول: أول برنامج', 1);

INSERT INTO public.lessons (id, course_id, chapter_id, title, description, video_url, duration_seconds, is_free_preview, is_published, sort_order) VALUES
  ('cccccccc-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'الدرس 1: تثبيت Python', 'خطوات تثبيت Python على ويندوز و ماك.', 'https://www.youtube.com/watch?v=YYXdXT2l-Gg', 900, true, true, 1),
  ('cccccccc-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000001', 'الدرس 2: أول برنامج Hello World', 'شرح أول سطر كود.', 'https://www.youtube.com/watch?v=kqtD5dpn9C8', 720, false, true, 2),
  ('cccccccc-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000002', 'الدرس 3: المتغيرات', 'أنواع المتغيرات وطرق استخدامها.', 'https://www.youtube.com/watch?v=cQT33yu9pY8', 1100, false, true, 3),
  ('cccccccc-0001-0000-0000-000000000004', 'aaaaaaaa-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000002', 'الدرس 4: الحلقات For و While', 'كل حاجة عن اللوپات.', 'https://www.youtube.com/watch?v=6iF8Xb7Z3wQ', 1350, false, true, 4),
  ('cccccccc-0001-0000-0000-000000000005', 'aaaaaaaa-0001-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000003', 'الدرس 1: هيكل صفحة HTML', 'مقدمة عن العلامات الأساسية.', 'https://www.youtube.com/watch?v=UB1O30fR-EE', 1000, true, true, 1),
  ('cccccccc-0001-0000-0000-000000000006', 'aaaaaaaa-0001-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000003', 'الدرس 2: التنسيق بـ CSS', 'ألوان، خطوط، ولايوت.', 'https://www.youtube.com/watch?v=1PnVor36_40', 1500, false, true, 2),
  ('cccccccc-0001-0000-0000-000000000007', 'aaaaaaaa-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000004', 'الدرس 1: ما هو الذكاء الاصطناعي؟', 'نظرة عامة على AI.', 'https://www.youtube.com/watch?v=ad79nYk2keg', 1200, true, true, 1),
  ('cccccccc-0001-0000-0000-000000000008', 'aaaaaaaa-0001-0000-0000-000000000004', 'bbbbbbbb-0001-0000-0000-000000000005', 'الدرس 1: أول برنامج بأي لغة', 'دخول سريع لعالم البرمجة.', 'https://www.youtube.com/watch?v=zOjov-2OZ0E', 600, true, true, 1);

INSERT INTO public.assignments (id, course_id, lesson_id, title, instructions, max_score, is_published) VALUES
  ('dddddddd-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000002', 'واجب: اكتب برنامج يجمع رقمين', 'برنامج بيقرأ رقمين من المستخدم ويطبع الناتج.', 10, true),
  ('dddddddd-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000004', 'واجب: اطبع الأرقام الزوجية من 1 لـ 100', 'استخدم حلقة for.', 10, true),
  ('dddddddd-0001-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000002', 'cccccccc-0001-0000-0000-000000000005', 'واجب: صمم صفحة تعريفية عن نفسك', 'استخدم HTML أساسي.', 15, true);

INSERT INTO public.quizzes (id, course_id, lesson_id, title, duration_minutes, pass_score, is_published) VALUES
  ('eeeeeeee-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', NULL, 'اختبار: أساسيات Python', 20, 60, true),
  ('eeeeeeee-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000003', NULL, 'اختبار: مفاهيم AI', 15, 70, true);

INSERT INTO public.quiz_questions (quiz_id, type, prompt, choices, correct_answer, points, sort_order) VALUES
  ('eeeeeeee-0001-0000-0000-000000000001', 'mcq', 'أي من التالي طريقة صحيحة لطباعة نص في Python؟', '["echo","print","printf","cout"]'::jsonb, '"print"'::jsonb, 2, 1),
  ('eeeeeeee-0001-0000-0000-000000000001', 'truefalse', 'Python لغة مترجمة.', '["صح","خطأ"]'::jsonb, '"صح"'::jsonb, 1, 2),
  ('eeeeeeee-0001-0000-0000-000000000001', 'mcq', 'رمز التعليق في Python؟', '["//","#","/*","<!--"]'::jsonb, '"#"'::jsonb, 2, 3),
  ('eeeeeeee-0001-0000-0000-000000000002', 'mcq', 'ما هو التعلم الآلي؟', '["فرع من AI","لغة برمجة","نوع من الشبكات","نظام تشغيل"]'::jsonb, '"فرع من AI"'::jsonb, 2, 1),
  ('eeeeeeee-0001-0000-0000-000000000002', 'truefalse', 'الشبكات العصبية مستوحاة من دماغ الإنسان.', '["صح","خطأ"]'::jsonb, '"صح"'::jsonb, 1, 2);

INSERT INTO public.live_sessions (id, course_id, title, description, stream_url, recording_url, starts_at, status) VALUES
  ('ffffffff-0001-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001', 'حصة مباشرة: حل مسائل Python', 'مراجعة عملية مع الطلاب', 'https://youtube.com/live/xxx', NULL, now() + interval '2 days', 'scheduled'),
  ('ffffffff-0001-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000002', 'حصة مسجّلة: مقدمة CSS Grid', NULL, NULL, 'https://www.youtube.com/watch?v=EFafSYg-PkI', now() - interval '3 days', 'ended');

INSERT INTO public.announcements (title, body, is_pinned) VALUES
  ('أهلاً بيكم في المنصة', 'المنصة دلوقتي شغالة، تقدروا تشوفوا الكورسات والدروس المجانية.', true),
  ('جدول البث المباشر لهذا الأسبوع', 'الأحد 8م: Python، الثلاثاء 8م: HTML/CSS.', false);

INSERT INTO public.materials (lesson_id, course_id, title, file_url, file_type)
SELECT l.id, l.course_id, 'ملخص الدرس PDF', 'https://example.com/demo/lesson-summary.pdf', 'pdf' FROM public.lessons l LIMIT 8;
INSERT INTO public.materials (course_id, title, file_url, file_type)
SELECT c.id, 'خطة مذاكرة الكورس', 'https://example.com/demo/course-plan.pdf', 'pdf' FROM public.courses c;