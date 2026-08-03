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
  IF _email IN ('dody505060607070@gmail.com','mr.elsayed2050@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- Grant admin now if the account already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'mr.elsayed2050@gmail.com'
ON CONFLICT DO NOTHING;