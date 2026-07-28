
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_phone TEXT;
BEGIN
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  INSERT INTO public.profiles (id, full_name, phone, grade)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NULLIF(v_phone,''), NEW.raw_user_meta_data->>'grade')
  ON CONFLICT (id) DO NOTHING;
  IF v_phone = '01222576172' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''),'student')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $function$;

-- Grant admin to existing user with the target phone if they exist
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles WHERE phone = '01222576172'
ON CONFLICT DO NOTHING;

-- Auto-confirm any existing unconfirmed users so they can log in immediately
UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE email_confirmed_at IS NULL;
