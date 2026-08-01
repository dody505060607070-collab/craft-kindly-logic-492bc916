DROP POLICY IF EXISTS "qq read" ON public.quiz_questions;
CREATE POLICY "qq admin read"
ON public.quiz_questions FOR SELECT TO authenticated
USING (public.is_admin());

REVOKE ALL ON public.quiz_questions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;

CREATE OR REPLACE FUNCTION public.get_quizzes_catalog()
RETURNS TABLE (
  id uuid,
  course_id uuid,
  title text,
  description text,
  duration_minutes integer,
  pass_score numeric,
  question_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.course_id, q.title, q.description,
         COALESCE(q.duration_minutes, q.duration_min, 0) AS duration_minutes,
         q.pass_score,
         count(qq.id) AS question_count
  FROM public.quizzes q
  LEFT JOIN public.quiz_questions qq ON qq.quiz_id = q.id
  WHERE q.is_published = true
  GROUP BY q.id, q.course_id, q.title, q.description, q.duration_minutes, q.duration_min, q.pass_score, q.created_at
  ORDER BY q.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_quizzes_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quizzes_catalog() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment public.payments%ROWTYPE;
  _days integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'للأدمن فقط';
  END IF;
  IF _status NOT IN ('paid', 'failed') THEN
    RAISE EXCEPTION 'حالة الدفع غير صالحة';
  END IF;

  SELECT * INTO _payment
  FROM public.payments
  WHERE id = _payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'عملية الدفع غير موجودة';
  END IF;

  UPDATE public.payments SET status = _status, updated_at = now() WHERE id = _payment_id;

  IF _status = 'paid' AND _payment.course_id IS NOT NULL THEN
    _days := CASE WHEN _payment.plan = 'year' THEN 365 ELSE 30 END;
    INSERT INTO public.enrollments (user_id, course_id, progress, expires_at)
    VALUES (_payment.user_id, _payment.course_id, 0, now() + make_interval(days => _days))
    ON CONFLICT (user_id, course_id) DO UPDATE
    SET expires_at = GREATEST(COALESCE(public.enrollments.expires_at, now()), now()) + make_interval(days => _days);
  END IF;
END
$$;
REVOKE ALL ON FUNCTION public.approve_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_playable_lessons(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_lessons_catalog(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lessons_catalog(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_live_sessions_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_sessions_catalog() TO anon, authenticated, service_role;