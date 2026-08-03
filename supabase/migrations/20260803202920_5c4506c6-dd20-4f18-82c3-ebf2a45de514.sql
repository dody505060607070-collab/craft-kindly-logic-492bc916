-- 1) question type on quiz questions
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'mcq';

-- 2) quizzes: lesson link + files
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS questions_file_url text,
  ADD COLUMN IF NOT EXISTS answer_key_url text,
  ADD COLUMN IF NOT EXISTS answer_key_text text;

-- 3) assignments: lesson link + files + quiz-like settings
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS questions_file_url text,
  ADD COLUMN IF NOT EXISTS answer_key_url text,
  ADD COLUMN IF NOT EXISTS answer_key_text text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS pass_score numeric NOT NULL DEFAULT 50;

-- 4) assignment questions
CREATE TABLE IF NOT EXISTS public.assignment_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'mcq',
  points integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_questions TO authenticated;
GRANT ALL ON public.assignment_questions TO service_role;

ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage assignment questions" ON public.assignment_questions;
CREATE POLICY "admins manage assignment questions"
ON public.assignment_questions FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS assignment_questions_touch ON public.assignment_questions;
CREATE TRIGGER assignment_questions_touch BEFORE UPDATE ON public.assignment_questions
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 5) submissions: store choice answers + auto grade
ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_score numeric,
  ADD COLUMN IF NOT EXISTS passed boolean,
  ADD COLUMN IF NOT EXISTS auto_graded boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS assignment_submissions_unique_user
  ON public.assignment_submissions (assignment_id, user_id);

-- 6) student-safe question fetchers
DROP FUNCTION IF EXISTS public.get_quiz_questions_for_student(uuid);
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(_quiz_id uuid)
RETURNS TABLE(id uuid, question text, options jsonb, points integer, sort_order integer, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT qq.id, qq.question, qq.options, qq.points, qq.sort_order, qq.kind
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = _quiz_id AND q.is_published = true
  ORDER BY qq.sort_order, qq.id;
$$;

CREATE OR REPLACE FUNCTION public.get_assignment_questions_for_student(_assignment_id uuid)
RETURNS TABLE(id uuid, question text, options jsonb, points integer, sort_order integer, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT aq.id, aq.question, aq.options, aq.points, aq.sort_order, aq.kind
  FROM public.assignment_questions aq
  JOIN public.assignments a ON a.id = aq.assignment_id
  WHERE aq.assignment_id = _assignment_id AND a.is_published = true
  ORDER BY aq.sort_order, aq.id;
$$;

CREATE OR REPLACE FUNCTION public.get_assignments_catalog()
RETURNS TABLE(id uuid, course_id uuid, lesson_id uuid, title text, instructions text, description text,
              due_at timestamptz, max_score numeric, duration_minutes integer, pass_score numeric,
              questions_file_url text, question_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.id, a.course_id, a.lesson_id, a.title, a.instructions, a.description,
         a.due_at, a.max_score, a.duration_minutes, a.pass_score, a.questions_file_url,
         count(aq.id) AS question_count
  FROM public.assignments a
  LEFT JOIN public.assignment_questions aq ON aq.assignment_id = a.id
  WHERE a.is_published = true
  GROUP BY a.id
  ORDER BY a.created_at DESC;
$$;

-- 7) auto-grade assignment submission
CREATE OR REPLACE FUNCTION public.submit_assignment_answers(_assignment_id uuid, _answers jsonb)
RETURNS TABLE(submission_id uuid, score numeric, max_score numeric, passed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _score numeric := 0;
  _max numeric := 0;
  _pass numeric := 50;
  _passed boolean;
  _sub_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT a.pass_score INTO _pass FROM public.assignments a
  WHERE a.id = _assignment_id AND a.is_published = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الواجب غير موجود أو غير منشور';
  END IF;

  SELECT COALESCE(sum(CASE WHEN (_answers ->> aq.id::text) ~ '^[0-9]+$'
                            AND (_answers ->> aq.id::text)::integer = aq.correct_index
                       THEN aq.points ELSE 0 END), 0),
         COALESCE(sum(aq.points), 0)
  INTO _score, _max
  FROM public.assignment_questions aq
  WHERE aq.assignment_id = _assignment_id;

  _passed := CASE WHEN _max > 0 THEN ((_score / _max) * 100) >= _pass ELSE false END;

  INSERT INTO public.assignment_submissions (assignment_id, user_id, answers, grade, max_score, passed, auto_graded)
  VALUES (_assignment_id, _user_id, _answers, _score, _max, _passed, true)
  ON CONFLICT (assignment_id, user_id) DO UPDATE
  SET answers = EXCLUDED.answers, grade = EXCLUDED.grade, max_score = EXCLUDED.max_score,
      passed = EXCLUDED.passed, auto_graded = true, updated_at = now()
  RETURNING id INTO _sub_id;

  RETURN QUERY SELECT _sub_id, _score, _max, _passed;
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_questions_for_student(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_assignment_answers(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_assignment_questions_for_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assignment_answers(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.get_quiz_questions_for_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignments_catalog() TO anon, authenticated;

-- hide answer key from non-admin readers of assignments/quizzes
REVOKE SELECT (answer_key_url, answer_key_text) ON public.assignments FROM anon, authenticated;
REVOKE SELECT (answer_key_url, answer_key_text) ON public.quizzes FROM anon, authenticated;