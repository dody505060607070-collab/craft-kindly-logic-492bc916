DROP FUNCTION IF EXISTS public.get_playable_lessons(uuid);

CREATE TABLE IF NOT EXISTS public.video_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    viewed_at timestamptz DEFAULT now() NOT NULL,
    device_id text
);

GRANT SELECT, INSERT ON public.video_views TO authenticated;
GRANT ALL ON public.video_views TO service_role;

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own view history" 
ON public.video_views FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own views" 
ON public.video_views FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_playable_lessons(_course_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    video_url text,
    max_views int,
    current_views int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.video_url,
        l.max_views,
        COALESCE((SELECT count(*)::int FROM public.video_views vv WHERE vv.lesson_id = l.id AND vv.user_id = auth.uid()), 0) as current_views
    FROM public.lessons l
    WHERE l.course_id = _course_id
      AND (
        l.is_free = true
        OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = _course_id
              AND e.user_id = auth.uid()
              AND (e.expires_at IS NULL OR e.expires_at > now())
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role = 'admin'
        )
      )
    GROUP BY l.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_playable_lessons(uuid) TO anon;

CREATE OR REPLACE FUNCTION public.track_video_view(_lesson_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.video_views (user_id, lesson_id)
    VALUES (auth.uid(), _lesson_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_video_view(uuid) TO authenticated;
