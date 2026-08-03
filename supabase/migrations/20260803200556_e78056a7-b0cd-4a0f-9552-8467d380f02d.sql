GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.ai_usage,
  public.announcements,
  public.assignment_submissions,
  public.assignments,
  public.chapters,
  public.coupons,
  public.course_variants,
  public.courses,
  public.enrollments,
  public.lesson_progress,
  public.lessons,
  public.live_messages,
  public.live_sessions,
  public.materials,
  public.messages,
  public.notifications,
  public.payments,
  public.profiles,
  public.quiz_attempts,
  public.quiz_questions,
  public.quizzes,
  public.site_settings,
  public.subjects,
  public.user_devices,
  public.user_roles,
  public.variant_events
TO authenticated;

GRANT ALL ON TABLE
  public.ai_usage,
  public.announcements,
  public.assignment_submissions,
  public.assignments,
  public.chapters,
  public.coupons,
  public.course_variants,
  public.courses,
  public.enrollments,
  public.lesson_progress,
  public.lessons,
  public.live_messages,
  public.live_sessions,
  public.materials,
  public.messages,
  public.notifications,
  public.payments,
  public.profiles,
  public.quiz_attempts,
  public.quiz_questions,
  public.quizzes,
  public.site_settings,
  public.subjects,
  public.user_devices,
  public.user_roles,
  public.variant_events
TO service_role;

GRANT SELECT ON TABLE
  public.announcements,
  public.assignments,
  public.chapters,
  public.course_variants,
  public.courses,
  public.live_sessions,
  public.quizzes,
  public.site_settings,
  public.subjects
TO anon;

CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(_quiz_id uuid)
RETURNS TABLE(id uuid, question text, options jsonb, points integer, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qq.id, qq.question, qq.options, qq.points, qq.sort_order
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = _quiz_id
    AND q.is_published = true
  ORDER BY qq.sort_order, qq.id;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_questions_for_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS TABLE(attempt_id uuid, score numeric, max_score numeric, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE(sum(CASE WHEN (_answers ->> qq.id::text)::integer = qq.correct_index THEN qq.points ELSE 0 END), 0),
    COALESCE(sum(qq.points), 0)
  INTO _score, _max_score
  FROM public.quiz_questions qq
  WHERE qq.quiz_id = _quiz_id
    AND (_answers ? qq.id::text)
    AND (_answers ->> qq.id::text) ~ '^[0-9]+$';

  SELECT COALESCE(sum(qq.points), 0)
  INTO _max_score
  FROM public.quiz_questions qq
  WHERE qq.quiz_id = _quiz_id;

  _passed := CASE WHEN _max_score > 0 THEN ((_score / _max_score) * 100) >= _pass_score ELSE false END;

  INSERT INTO public.quiz_attempts (quiz_id, user_id, answers, score, max_score, passed)
  VALUES (_quiz_id, _user_id, _answers, _score, _max_score, _passed)
  RETURNING id INTO _attempt_id;

  RETURN QUERY SELECT _attempt_id, _score, _max_score, _passed;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;