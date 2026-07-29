
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _name  text;
  _email text;
BEGIN
  _phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  _name  := COALESCE(NEW.raw_user_meta_data->>'full_name', 'طالب');
  _email := lower(COALESCE(NEW.email, ''));
  INSERT INTO public.profiles (id, full_name, phone) VALUES (NEW.id, _name, _phone);
  IF _email = 'dody505060607070@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- Remove any admin role that isn't the designated admin email
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = 'dody505060607070@gmail.com'
  );

-- Ensure remaining users without a role get 'student'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT DO NOTHING;
