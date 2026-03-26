-- SOLUCIÓN PARA VISIBILIDAD DE DATOS (SUPER ADMIN)
-- Permite que los Super Admins vean los vendedores y sheets de sus supervisores

-- 1. Políticas para la tabla SELLERS
DROP POLICY IF EXISTS "SuperAdmins can view all sellers" ON public.sellers;
CREATE POLICY "SuperAdmins can view all sellers"
ON public.sellers FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  auth.uid() = created_by
);

-- 2. Políticas para la tabla SELLER_SHEETS
DROP POLICY IF EXISTS "SuperAdmins can view all sheets" ON public.seller_sheets;
CREATE POLICY "SuperAdmins can view all sheets"
ON public.seller_sheets FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  EXISTS (
    SELECT 1 FROM public.sellers 
    WHERE public.sellers.id = public.seller_sheets.seller_id 
    AND public.sellers.created_by = auth.uid()
  )
);

-- 3. Asegurar que el Coordinador pueda ver quién supervisa a quién
-- (Ya lo hicimos pero reforzamos por si acaso)
DROP POLICY IF EXISTS "SuperAdmins can view all assignments" ON public.coordinator_supervisors;
CREATE POLICY "SuperAdmins can view all assignments"
ON public.coordinator_supervisors FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  coordinator_id = auth.uid()
);
