GRANT SELECT ON public.profiles TO anon;

CREATE POLICY "Allow public read-only count" ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
