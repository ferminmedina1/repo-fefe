-- FILE: 20260420_add_dashboard_names.sql
-- Permite múltiples dashboards por usuario-compañía con nombres identificables

-- 1. Agregar campo name a dashboard_layouts (si no existe)
ALTER TABLE IF EXISTS public.dashboard_layouts 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Mi Panel de Control';

-- 2. Remover la constraint anterior (solo 1 default por user-company)
-- Permitir NULL en is_default para dashboards secundarios
ALTER TABLE IF EXISTS public.dashboard_layouts
DROP CONSTRAINT IF EXISTS unique_default_per_user_company;

-- 3. Nueva constraint: solo UNO puede ser default por user-company
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_layouts_unique_default
ON public.dashboard_layouts(user_id, company_id)
WHERE is_default = TRUE;

-- 4. Índice para búsqueda rápida de todos los layouts de un usuario
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_company_name
ON public.dashboard_layouts(user_id, company_id, name);

-- 5. Actualizar RLS policies para dashboard_layouts si es necesario
-- (Las políticas existentes ya debería permitir acceso a todos los layouts del usuario)

-- Confirmación
SELECT 'Migration 20260420_add_dashboard_names completed successfully';
