DROP FUNCTION IF EXISTS public.redeem_access_code(text);
CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code_row record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'سجّل دخولك أولاً';
  END IF;

  SELECT ac.* INTO v_code_row
  FROM public.access_codes ac
  WHERE ac.code = _code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الكود غير صحيح';
  END IF;

  IF v_code_row.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'هذا الكود تم استخدامه مسبقاً';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = v_user_id 
    AND e.course_id = v_code_row.course_id
    AND (e.expires_at IS NULL OR e.expires_at > now())
  ) THEN
    UPDATE public.enrollments
    SET expires_at = now() + (v_code_row.duration_days || ' days')::interval,
        updated_at = now()
    WHERE user_id = v_user_id AND course_id = v_code_row.course_id;
  ELSE
    INSERT INTO public.enrollments (user_id, course_id, expires_at)
    VALUES (v_user_id, v_code_row.course_id, now() + (v_code_row.duration_days || ' days')::interval);
  END IF;

  UPDATE public.access_codes
  SET used_at = now(),
      used_by = v_user_id,
      updated_at = now()
  WHERE code = _code;
END;
$$;

DROP FUNCTION IF EXISTS public.submit_quiz_attempt(uuid, json);
DROP FUNCTION IF EXISTS public.submit_quiz_attempt(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS TABLE (attempt_id uuid, score integer, max_score integer, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quiz record;
  v_question record;
  v_total_points integer := 0;
  v_earned_points integer := 0;
  v_pass_score integer;
  v_attempt_id uuid;
  v_is_passed boolean;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = _quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'الاختبار غير موجود'; END IF;

  FOR v_question IN SELECT * FROM public.quiz_questions WHERE quiz_id = _quiz_id LOOP
    v_total_points := v_total_points + COALESCE(v_question.points, 1);
    
    IF v_question.kind IN ('mcq', 'tf') THEN
      IF (_answers->>v_question.id::text)::integer = v_question.correct_index THEN
        v_earned_points := v_earned_points + COALESCE(v_question.points, 1);
      END IF;
    END IF;
  END LOOP;

  v_pass_score := (v_total_points * v_quiz.pass_score / 100);
  v_is_passed := (v_earned_points >= v_pass_score);

  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, max_score, passed, answers)
  VALUES (v_user_id, _quiz_id, v_earned_points, v_total_points, v_is_passed, _answers)
  RETURNING id INTO v_attempt_id;

  RETURN QUERY SELECT v_attempt_id, v_earned_points, v_total_points, v_is_passed;
END;
$$;
