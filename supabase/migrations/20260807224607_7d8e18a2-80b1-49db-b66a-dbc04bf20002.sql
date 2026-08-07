-- Update get_assignment_questions_for_student to check for subscription
CREATE OR REPLACE FUNCTION public.get_assignment_questions_for_student(_assignment_id uuid)
 RETURNS TABLE(id uuid, question text, options jsonb, points integer, sort_order integer, kind text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _course_id uuid;
  _is_admin boolean;
  _is_enrolled boolean;
  _is_course_free boolean;
BEGIN
  -- Get the course_id for this assignment
  SELECT course_id INTO _course_id FROM assignments WHERE id = _assignment_id;

  -- Check if user is admin
  _is_admin := exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
    and ur.role = 'admin'
  );

  -- Check if course is free
  _is_course_free := exists (
    select 1 from courses c
    where c.id = _course_id
    and (c.is_free = true or c.price = 0)
  );

  -- Check if user is enrolled
  _is_enrolled := exists (
    select 1 from enrollments e
    where e.user_id = auth.uid()
    and e.course_id = _course_id
    and (e.expires_at is null or e.expires_at > now())
  );

  -- If not admin, not enrolled, and course not free, return nothing
  IF NOT (_is_admin OR _is_enrolled OR _is_course_free) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT aq.id, aq.question, aq.options, aq.points, aq.sort_order, aq.kind
  FROM public.assignment_questions aq
  JOIN public.assignments a ON a.id = aq.assignment_id
  WHERE aq.assignment_id = _assignment_id AND a.is_published = true
  ORDER BY aq.sort_order, aq.id;
END;
$function$;

-- Update get_quiz_questions_for_student to check for subscription
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(_quiz_id uuid)
 RETURNS TABLE(id uuid, question text, options jsonb, points integer, sort_order integer, kind text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _course_id uuid;
  _is_admin boolean;
  _is_enrolled boolean;
  _is_course_free boolean;
BEGIN
  -- Get the course_id for this quiz
  SELECT course_id INTO _course_id FROM quizzes WHERE id = _quiz_id;

  -- Check if user is admin
  _is_admin := exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
    and ur.role = 'admin'
  );

  -- Check if course is free
  _is_course_free := exists (
    select 1 from courses c
    where c.id = _course_id
    and (c.is_free = true or c.price = 0)
  );

  -- Check if user is enrolled
  _is_enrolled := exists (
    select 1 from enrollments e
    where e.user_id = auth.uid()
    and e.course_id = _course_id
    and (e.expires_at is null or e.expires_at > now())
  );

  -- If not admin, not enrolled, and course not free, return nothing
  IF NOT (_is_admin OR _is_enrolled OR _is_course_free) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT qq.id, qq.question, qq.options, qq.points, qq.sort_order, qq.kind
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = _quiz_id AND q.is_published = true
  ORDER BY qq.sort_order, qq.id;
END;
$function$;
