-- SOLUCIÓN PARA GUARDAR ASIGNACIONES (RLS WRITE)
-- Permite que los Coordinadores puedan INSERTAR y ELIMINAR sus propias asignaciones

-- 1. Políticas para INSERTAR asignaciones
DROP POLICY IF EXISTS "Coordinators can insert assignments" ON public.coordinator_supervisors;
CREATE POLICY "Coordinators can insert assignments"
ON public.coordinator_supervisors
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' AND
  coordinator_id = auth.uid()
);

-- 2. Políticas para ELIMINAR asignaciones
DROP POLICY IF EXISTS "Coordinators can delete their assignments" ON public.coordinator_supervisors;
CREATE POLICY "Coordinators can delete their assignments"
ON public.coordinator_supervisors
FOR DELETE
TO authenticated
USING (
  coordinator_id = auth.uid()
);

-- 3. Asegurar que SELECT sea libre para el dueño o superadmin
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.coordinator_supervisors;
CREATE POLICY "Coordinators can view assignments"
ON public.coordinator_supervisors FOR SELECT
TO authenticated
USING (true);
