-- 1. Actualizar roles existentes de 'coordinator' a 'superadmin'
UPDATE public.profiles SET role = 'superadmin' WHERE role = 'coordinator';

-- 2. Asegurar que el trigger maneje correctamente el nuevo rol
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'admin') -- 'admin' es Supervisor por defecto
  );
  RETURN new;
END;
$$;

-- 3. COMANDO PARA CONFIRMAR USUARIO MANUALMENTE (Si el link no llega al correo)
-- Ejecuta esto reemplazando el email para poder iniciar sesión de inmediato:
-- UPDATE auth.users SET email_confirmed_at = now(), confirmed_at = now() WHERE email = 'TU_EMAIL_AQUI';
