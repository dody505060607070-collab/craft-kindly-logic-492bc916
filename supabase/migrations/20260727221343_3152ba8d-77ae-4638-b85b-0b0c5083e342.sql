
-- 1) Announcements: restrict to authenticated
DROP POLICY IF EXISTS ann_read ON public.announcements;
CREATE POLICY ann_read ON public.announcements FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.announcements FROM anon;

-- 2) Chapters: only for published courses
DROP POLICY IF EXISTS chapters_read ON public.chapters;
CREATE POLICY chapters_read ON public.chapters FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = chapters.course_id AND c.is_published)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 3) Lessons: tighten to enrolled/admin/free_preview/free-course
DROP POLICY IF EXISTS lessons_read ON public.lessons;
CREATE POLICY lessons_read ON public.lessons FOR SELECT TO anon, authenticated
USING (
  is_published AND (
    is_free_preview
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid() AND e.course_id = lessons.course_id
    )
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.is_free AND c.is_published
    )
  )
);

-- Public catalog view of lesson metadata (no video_url/transcript)
CREATE OR REPLACE VIEW public.lessons_catalog
WITH (security_invoker = false) AS
SELECT
  l.id, l.course_id, l.chapter_id, l.title, l.description,
  l.duration_seconds, l.is_free_preview, l.is_published, l.sort_order,
  l.summary, l.created_at, l.updated_at
FROM public.lessons l
WHERE l.is_published
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = l.course_id AND c.is_published);

GRANT SELECT ON public.lessons_catalog TO anon, authenticated;

-- 4) Live sessions: restrict stream/recording URLs
DROP POLICY IF EXISTS live_read ON public.live_sessions;
CREATE POLICY live_read ON public.live_sessions FOR SELECT TO anon, authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR course_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = live_sessions.course_id AND c.is_free AND c.is_published
  )
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid() AND e.course_id = live_sessions.course_id
  )
);

-- Public catalog view of session schedule (no stream_url / recording_url)
CREATE OR REPLACE VIEW public.live_sessions_catalog
WITH (security_invoker = false) AS
SELECT id, course_id, title, description, starts_at, status, created_at
FROM public.live_sessions;

GRANT SELECT ON public.live_sessions_catalog TO anon, authenticated;

-- 5) Variant events: prevent user_id spoofing
DROP POLICY IF EXISTS variant_events_public_insert ON public.variant_events;
CREATE POLICY variant_events_public_insert ON public.variant_events FOR INSERT TO anon, authenticated
WITH CHECK (
  course_id IS NOT NULL
  AND event = ANY (ARRAY['view'::text, 'click'::text, 'enroll'::text])
  AND (user_id IS NULL OR user_id = auth.uid())
);
