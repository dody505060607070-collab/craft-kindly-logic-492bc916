
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
  _email := COALESCE(NEW.email, '');
  INSERT INTO public.profiles (id, full_name, phone) VALUES (NEW.id, _name, _phone);
  IF _phone IN ('01016177688','01222576172') OR lower(_email) = 'dody505060607070@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
