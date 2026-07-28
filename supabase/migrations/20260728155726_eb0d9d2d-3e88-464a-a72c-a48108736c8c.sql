
-- courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grade text;

-- lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS transcript text;

-- assignments
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS max_score numeric NOT NULL DEFAULT 100;

-- quizzes
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS duration_minutes int,
  ADD COLUMN IF NOT EXISTS pass_score numeric NOT NULL DEFAULT 50;

-- quiz_questions
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS prompt text,
  ADD COLUMN IF NOT EXISTS correct_answer text;

-- quiz_attempts
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS stream_url text,
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

-- variant_events: fix permissive INSERT policy (require session_key present)
DROP POLICY IF EXISTS "ve insert" ON public.variant_events;
CREATE POLICY "ve insert" ON public.variant_events FOR INSERT TO anon, authenticated
  WITH CHECK (session_key IS NOT NULL AND length(session_key) > 0);

-- Tighten SECURITY DEFINER function grants
REVOKE EXECUTE ON FUNCTION public.get_lessons_catalog(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_live_sessions_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lessons_catalog(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_sessions_catalog() TO authenticated;
