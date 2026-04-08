-- Políticas para permitir a los supervisores editar y eliminar sus propios vendedores
DROP POLICY IF EXISTS "Users can update their own sellers" ON public.sellers;
CREATE POLICY "Users can update their own sellers"
ON public.sellers FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own sellers" ON public.sellers;
CREATE POLICY "Users can delete their own sellers"
ON public.sellers FOR DELETE
USING (auth.uid() = created_by);
