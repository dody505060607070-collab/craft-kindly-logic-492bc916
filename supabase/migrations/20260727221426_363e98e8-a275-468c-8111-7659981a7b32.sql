
DROP VIEW IF EXISTS public.lessons_catalog;
DROP VIEW IF EXISTS public.live_sessions_catalog;

CREATE OR REPLACE FUNCTION public.get_lessons_catalog(_course_id uuid)
RETURNS TABLE (
  id uuid, course_id uuid, chapter_id uuid, title text, description text,
  duration_seconds integer, is_free_preview boolean, is_published boolean,
  sort_order integer, summary text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.course_id, l.chapter_id, l.title, l.description,
         l.duration_seconds, l.is_free_preview, l.is_published,
         l.sort_order, l.summary, l.created_at, l.updated_at
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE l.is_published AND c.is_published AND l.course_id = _course_id
  ORDER BY l.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_lessons_catalog(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_live_sessions_catalog()
RETURNS TABLE (
  id uuid, course_id uuid, title text, description text,
  starts_at timestamptz, status public.live_status, created_at timestamptz,
  course_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.course_id, s.title, s.description, s.starts_at, s.status, s.created_at,
         c.title AS course_title
  FROM public.live_sessions s
  LEFT JOIN public.courses c ON c.id = s.course_id
  WHERE c.id IS NULL OR c.is_published
  ORDER BY s.starts_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_sessions_catalog() TO anon, authenticated;
