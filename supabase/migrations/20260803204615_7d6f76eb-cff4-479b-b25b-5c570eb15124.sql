ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS model_answer text;
ALTER TABLE public.assignment_questions ADD COLUMN IF NOT EXISTS model_answer text;

-- objective-only auto scoring; essay questions graded afterwards by AI
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS TABLE(attempt_id uuid, score numeric, max_score numeric, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _score numeric := 0;
  _max_score numeric := 0;
  _pass_score numeric := 50;
  _attempt_id uuid;
  _passed boolean;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT q.pass_score INTO _pass_score
  FROM public.quizzes q
  WHERE q.id = _quiz_id AND q.is_published = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الاختبار غير موجود أو غير منشور';
  END IF;

  SELECT
    COALESCE(sum(CASE WHEN (_answers ->> qq.id::text) ~ '^[0-9]+$'
                       AND (_answers ->> qq.id::text)::integer = qq.correct_index
                  THEN qq.points ELSE 0 END), 0),
    COALESCE(sum(qq.points), 0)
  INTO _score, _max_score
  FROM public.quiz_questions qq
  WHERE qq.quiz_id = _quiz_id AND COALESCE(qq.kind, 'mcq') <> 'essay';

  _passed := CASE WHEN _max_score > 0 THEN ((_score / _max_score) * 100) >= _pass_score ELSE false END;

  INSERT INTO public.quiz_attempts (quiz_id, user_id, answers, score, max_score, passed)
  VALUES (_quiz_id, _user_id, _answers, _score, _max_score, _passed)
  RETURNING id INTO _attempt_id;

  RETURN QUERY SELECT _attempt_id, _score, _max_score, _passed;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_assignment_answers(_assignment_id uuid, _answers jsonb)
RETURNS TABLE(submission_id uuid, score numeric, max_score numeric, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  WHERE aq.assignment_id = _assignment_id AND COALESCE(aq.kind, 'mcq') <> 'essay';

  _passed := CASE WHEN _max > 0 THEN ((_score / _max) * 100) >= _pass ELSE false END;

  INSERT INTO public.assignment_submissions (assignment_id, user_id, answers, grade, max_score, passed, auto_graded)
  VALUES (_assignment_id, _user_id, _answers, _score, _max, _passed, true)
  ON CONFLICT (assignment_id, user_id) DO UPDATE
  SET answers = EXCLUDED.answers, grade = EXCLUDED.grade, max_score = EXCLUDED.max_score,
      passed = EXCLUDED.passed, auto_graded = true, updated_at = now()
  RETURNING id INTO _sub_id;

  RETURN QUERY SELECT _sub_id, _score, _max, _passed;
END;
$function$;