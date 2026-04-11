-- Agregar campos de login a vendedores
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS password TEXT;

-- Asignar contraseña predeterminada (DN2026*) a los vendedores existentes
-- Nota: En un sistema real usaríamos el hash. Aquí lo guardamos para luego procesarlo o usarlo como texto plano si así se prefiere por simplicidad inicial, 
-- pero recomiendo aplicar un hash. Por ahora lo pondremos como texto para que el usuario pueda validarlo.
UPDATE public.sellers SET password = 'DN2026*' WHERE password IS NULL;

-- Poblar emails si están vacíos (usando nombre + apellido como fallback)
-- El usuario dijo que loguearán con correo, pero si no tienen, creamos uno temporal.
UPDATE public.sellers 
SET email = LOWER(REPLACE(first_name, ' ', '')) || '.' || LOWER(REPLACE(last_name, ' ', '')) || '@vendedor.com'
WHERE email IS NULL;
