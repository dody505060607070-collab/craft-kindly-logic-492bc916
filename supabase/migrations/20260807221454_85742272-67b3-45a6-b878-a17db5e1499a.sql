-- Add max_attempts to quizzes and assignments
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 0;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 0;

-- Drop functions first to change return type
DROP FUNCTION IF EXISTS public.get_quizzes_catalog();
DROP FUNCTION IF EXISTS public.get_assignments_catalog();

-- Re-create the catalog functions to include max_attempts
CREATE OR REPLACE FUNCTION public.get_quizzes_catalog()
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    duration_minutes integer,
    pass_score integer,
    question_count bigint,
    course_id uuid,
    max_attempts integer
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        q.id,
        q.title,
        q.description,
        q.duration_minutes,
        q.pass_score,
        COUNT(qq.id) as question_count,
        q.course_id,
        q.max_attempts
    FROM public.quizzes q
    LEFT JOIN public.quiz_questions qq ON qq.quiz_id = q.id
    WHERE q.is_published = true
    GROUP BY q.id;
$$;

CREATE OR REPLACE FUNCTION public.get_assignments_catalog()
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    instructions text,
    due_at timestamptz,
    duration_minutes integer,
    max_score integer,
    pass_score integer,
    questions_file_url text,
    question_count bigint,
    course_id uuid,
    lesson_id uuid,
    max_attempts integer
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        a.id,
        a.title,
        a.description,
        a.instructions,
        a.due_at,
        a.duration_minutes,
        a.max_score,
        a.pass_score,
        a.questions_file_url,
        COUNT(aq.id) as question_count,
        a.course_id,
        a.lesson_id,
        a.max_attempts
    FROM public.assignments a
    LEFT JOIN public.assignment_questions aq ON aq.assignment_id = a.id
    WHERE a.is_published = true
    GROUP BY a.id;
$$;

GRANT SELECT ON public.quizzes TO authenticated, anon;
GRANT SELECT ON public.assignments TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_quizzes_catalog() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_assignments_catalog() TO authenticated, anon;
