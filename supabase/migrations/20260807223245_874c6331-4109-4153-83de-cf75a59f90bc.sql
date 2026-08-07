-- 1) Restrict answer-key columns: remove table-wide SELECT, re-grant only non-sensitive columns
REVOKE SELECT ON public.quizzes FROM anon, authenticated;
GRANT SELECT (id, course_id, title, description, duration_min, is_published, created_at, updated_at, duration_minutes, pass_score, lesson_id, questions_file_url, max_attempts)
  ON public.quizzes TO anon, authenticated;

REVOKE SELECT ON public.assignments FROM anon, authenticated;
GRANT SELECT (id, course_id, title, description, due_at, is_published, created_at, updated_at, instructions, max_score, lesson_id, questions_file_url, duration_minutes, pass_score, max_attempts)
  ON public.assignments TO anon, authenticated;

-- Admins still need to write answer keys (write-only, no read back)
GRANT INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
GRANT ALL ON public.assignments TO service_role;

-- 2) Fix mutable search_path on remaining functions
CREATE OR REPLACE FUNCTION public.track_video_view(_lesson_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.video_views (user_id, lesson_id)
    VALUES (auth.uid(), _lesson_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_assignments_catalog()
RETURNS TABLE(id uuid, title text, description text, instructions text, due_at timestamp with time zone, duration_minutes integer, max_score integer, pass_score integer, questions_file_url text, question_count bigint, course_id uuid, lesson_id uuid, max_attempts integer)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
    SELECT
        a.id,
        a.title,
        a.description,
        a.instructions,
        a.due_at,
        a.duration_minutes,
        a.max_score::integer,
        a.pass_score::integer,
        a.questions_file_url,
        COUNT(aq.id) as question_count,
        a.course_id,
        a.lesson_id,
        a.max_attempts
    FROM public.assignments a
    LEFT JOIN public.assignment_questions aq ON aq.assignment_id = a.id
    WHERE a.is_published = true
    GROUP BY a.id;
$function$;

CREATE OR REPLACE FUNCTION public.get_quizzes_catalog()
RETURNS TABLE(id uuid, title text, description text, duration_minutes integer, pass_score integer, question_count bigint, course_id uuid, max_attempts integer)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
    SELECT
        q.id,
        q.title,
        q.description,
        q.duration_minutes,
        q.pass_score::integer,
        COUNT(qq.id) as question_count,
        q.course_id,
        q.max_attempts
    FROM public.quizzes q
    LEFT JOIN public.quiz_questions qq ON qq.quiz_id = q.id
    WHERE q.is_published = true
    GROUP BY q.id;
$function$;