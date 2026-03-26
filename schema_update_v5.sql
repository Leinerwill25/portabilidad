-- SOLUCIÓN PARA VISIBILIDAD DE SUPERVISORES (RLS)
-- Este SQL permite que el Coordinador vea a los demás usuarios para poder asignarlos

-- 1. Asegurar que RLS esté activo pero con una política de lectura para Super Admins
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas restrictivas previas (si existen) para evitar duplicados
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Coordinators can view all profiles" ON public.profiles;

-- 3. Crear política para que cualquier usuario autenticado vea los perfiles básicos
-- (Es común que el nombre/email sea visible para búsqueda interna)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4. Por si acaso, asegurar que la tabla de asignaciones también sea leíble
ALTER TABLE public.coordinator_supervisors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.coordinator_supervisors;
CREATE POLICY "Allow read for authenticated users"
  ON public.coordinator_supervisors
  FOR SELECT
  TO authenticated
  USING (true);
