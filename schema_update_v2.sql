-- Este SQL actualiza la función de Supabase para que tome el rol seleccionado en el registro (Supervisor o Coordinador)
-- Ejecuta esto en el SQL Editor de Supabase

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
    COALESCE(new.raw_user_meta_data->>'role', 'admin')
  );
  RETURN new;
END;
$$;
