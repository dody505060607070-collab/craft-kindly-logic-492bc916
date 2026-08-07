ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS max_views INTEGER DEFAULT 0;

-- Refresh the view or function if needed (already done in previous migration but ensuring column exists)
GRANT SELECT, UPDATE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;