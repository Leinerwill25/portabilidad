-- SOLUCIÓN AL ERROR DE CONSTRAINT (ORDEN CORREGIDO)
-- Este SQL resuelve el error de "is violated by some row" al actualizar el orden de ejecución

-- 1. ELIMINAR el bloqueo antiguo primero
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. ACTUALIZAR los datos existentes antes de poner el nuevo candado
-- Esto convierte cualquier 'coordinator' previo al nuevo rol 'superadmin'
UPDATE public.profiles SET role = 'superadmin' WHERE role = 'coordinator';

-- 3. AHORA SÍ, poner el nuevo constraint con los roles permitidos
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'viewer'::text, 'superadmin'::text]));

-- 4. Actualizar la función del trigger para que use 'superadmin'
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
    COALESCE(new.raw_user_meta_data->>'role', 'admin') -- Fallback a Supervisor (admin)
  );
  RETURN new;
END;
$$;

-- 5. OPCIONAL: Confirmar manualmente un usuario si el correo no llega
-- UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'TU_EMAIL_AQUI';
