-- FILE: 20260417_FIX_dashboard_migrations.sql
-- PROPÓSITO: Crear funciones que faltan antes de ejecutar migrations
-- EJECUTAR PRIMERO, antes de las otras migraciones

-- ============================================================================
-- FIX 1: Crear función para actualizar timestamp de dashboard_templates
-- ============================================================================
-- RAZÓN: dashboard_templates.sql usa esta función en trigger pero no la crea
CREATE OR REPLACE FUNCTION public.update_dashboard_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 2: Crear función para actualizar timestamp de dashboard_configs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_dashboard_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 3: Crear función para actualizar timestamp de dashboard_layouts
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_dashboard_layouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 4: Función para generar share tokens automáticamente
-- ============================================================================
-- RAZÓN: dashboard_shares propone esta función pero nunca se ejecuta
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(gen_random_bytes(12), 'base64');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX 5: Función helper para generar token si es NULL
-- ============================================================================
-- Usada como trigger callback
CREATE OR REPLACE FUNCTION public.generate_share_token_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := public.generate_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VALIDACIÓN: Verificar que todas las funciones se crearon
-- ============================================================================
-- SELECT proname, pronargs FROM pg_proc 
-- WHERE proname LIKE 'update_dashboard%' OR proname LIKE 'generate_share%';
-- ESPERADO: 5 funciones
