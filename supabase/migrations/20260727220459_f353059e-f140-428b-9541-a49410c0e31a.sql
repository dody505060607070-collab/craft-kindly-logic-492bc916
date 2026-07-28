
DROP POLICY IF EXISTS "variant_events_public_insert" ON public.variant_events;
CREATE POLICY "variant_events_public_insert" ON public.variant_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (course_id IS NOT NULL AND event IN ('view','click','enroll'));
