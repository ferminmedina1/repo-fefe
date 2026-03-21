-- Migración para añadir soporte de etiquetas y campos personalizados en la tabla products

-- Añadir array de strings para etiquetas
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Añadir JSONB para los valores de los campos personalizados guardados en cada producto
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- Añadir JSONB para las definiciones formales de los campos (opcional, dependiendo de cómo guardan el esquema)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS custom_field_definitions jsonb DEFAULT '[]'::jsonb;
