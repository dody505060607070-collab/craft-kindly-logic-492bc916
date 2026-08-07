ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price_term numeric DEFAULT 0;
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;