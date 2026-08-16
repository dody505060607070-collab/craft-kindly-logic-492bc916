INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'dody505060607070@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;