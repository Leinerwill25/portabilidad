-- AÑADIR CAMPO DE ESTATUS A VENDEDORES
-- Permite distinguir entre vendedores Activos y Egresados

ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo' CHECK (status IN ('activo', 'egresado'));

-- Actualizar registros existentes si es necesario (aunque el DEFAULT ya lo hace)
UPDATE public.sellers SET status = 'activo' WHERE status IS NULL;
