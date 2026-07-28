
-- AI usage ledger (rate limiting + analytics)
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_time_idx ON public.ai_usage (user_id, created_at DESC);
CREATE INDEX ai_usage_time_idx ON public.ai_usage (created_at DESC);
GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_own_or_admin_select" ON public.ai_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "ai_usage_self_insert" ON public.ai_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- A/B testing: course variants
CREATE TABLE public.course_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  title_override text,
  description_override text,
  cover_override text,
  price_override numeric,
  weight integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX course_variants_course_idx ON public.course_variants (course_id, is_active);
GRANT SELECT ON public.course_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_variants TO authenticated;
GRANT ALL ON public.course_variants TO service_role;
ALTER TABLE public.course_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_read_active" ON public.course_variants
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());
CREATE POLICY "variants_admin_all" ON public.course_variants
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- A/B testing: variant events (view/click/enroll)
CREATE TABLE public.variant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES public.course_variants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('view','click','enroll')),
  user_id uuid,
  session_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX variant_events_variant_idx ON public.variant_events (variant_id, event, created_at DESC);
CREATE INDEX variant_events_course_idx ON public.variant_events (course_id, event, created_at DESC);
GRANT INSERT ON public.variant_events TO anon, authenticated;
GRANT SELECT ON public.variant_events TO authenticated;
GRANT ALL ON public.variant_events TO service_role;
ALTER TABLE public.variant_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variant_events_public_insert" ON public.variant_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "variant_events_admin_select" ON public.variant_events
  FOR SELECT TO authenticated
  USING (public.is_admin());
