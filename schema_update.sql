-- 1. Actualizar roles en la tabla profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'viewer'::text, 'coordinator'::text]));

-- 2. Crear tabla de relación Coordinador <=> Supervisor
-- En este sistema: 
-- - 'coordinator' es el Super Admin
-- - 'admin' es el Supervisor
CREATE TABLE IF NOT EXISTS public.coordinator_supervisors (
  coordinator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (coordinator_id, supervisor_id)
);

-- 3. Habilitar RLS en la nueva tabla
ALTER TABLE public.coordinator_supervisors ENABLE ROW LEVEL SECURITY;

-- Política: Los coordinadores pueden gestionar sus propias asignaciones
CREATE POLICY "Coordinators can manage their supervisors"
  ON public.coordinator_supervisors
  FOR ALL
  TO authenticated
  USING (auth.uid() = coordinator_id);

-- Política: Lectura pública/autenticada para lógica de negocio
CREATE POLICY "Allow read for authenticated users"
  ON public.coordinator_supervisors
  FOR SELECT
  TO authenticated
  USING (true);
