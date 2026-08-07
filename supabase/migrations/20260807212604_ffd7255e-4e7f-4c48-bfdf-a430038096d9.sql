-- 1. Drop existing function to change signature
DROP FUNCTION IF EXISTS public.get_playable_lessons(UUID);

-- 2. Re-create get_playable_lessons with new columns
CREATE OR REPLACE FUNCTION public.get_playable_lessons(_course_id UUID)
RETURNS TABLE (
    id UUID,
    video_url TEXT,
    description TEXT,
    max_views INTEGER,
    current_views INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_enrolled BOOLEAN;
BEGIN
    -- Check admin
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin') INTO v_is_admin;
    
    -- Check enrollment
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE course_id = _course_id 
          AND user_id = v_user_id 
          AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO v_enrolled;

    RETURN QUERY
    SELECT 
        l.id,
        l.video_url,
        l.description,
        l.max_views,
        COALESCE(vv.view_count, 0) as current_views
    FROM public.lessons l
    LEFT JOIN public.video_views vv ON vv.lesson_id = l.id AND vv.user_id = v_user_id
    WHERE l.course_id = _course_id
      AND (
        v_is_admin 
        OR l.is_free 
        OR v_enrolled
      );
END;
$$;
