
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS show_as_popup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS marquee_text text,
  ADD COLUMN IF NOT EXISTS marquee_enabled boolean NOT NULL DEFAULT false;

-- Allow anon to read announcements + site_settings for popup/marquee on public pages
DO $$ BEGIN
  DROP POLICY IF EXISTS ann_read_anon ON public.announcements;
  CREATE POLICY ann_read_anon ON public.announcements FOR SELECT TO anon USING (is_active = true);
EXCEPTION WHEN others THEN NULL; END $$;

GRANT SELECT ON public.announcements TO anon;

DO $$ BEGIN
  DROP POLICY IF EXISTS site_settings_read_anon ON public.site_settings;
  CREATE POLICY site_settings_read_anon ON public.site_settings FOR SELECT TO anon USING (true);
EXCEPTION WHEN others THEN NULL; END $$;

GRANT SELECT ON public.site_settings TO anon;
