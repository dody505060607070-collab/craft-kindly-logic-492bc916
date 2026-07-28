
CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  payment_phone TEXT NOT NULL DEFAULT '01019209604',
  payment_instapay TEXT NOT NULL DEFAULT '01019209604',
  payment_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT UPDATE, INSERT ON public.site_settings TO authenticated;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings_read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_admin_write" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.site_settings (id) VALUES ('main') ON CONFLICT DO NOTHING;
