-- FILE: VALIDATION_CHECK_DASHBOARD_TABLES.sql
-- Propósito: Validar que todas las migraciones de dashboard se ejecutaron correctamente
-- Ejecutar DESPUÉS de todas las migraciones
-- Copiar este contenido en Supabase SQL Editor y ejecutar

-- ============================================================================
-- 📋 VALIDACIÓN 1: Verificar que todas las tablas existen
-- ============================================================================
SELECT 
  'TABLES' as check_type,
  tablename as entity_name,
  'EXISTS' as status,
  'Primary tables created' as description
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN (
  'dashboard_layouts',
  'dashboard_configs', 
  'dashboard_shares',
  'dashboard_templates',
  'custom_metrics',
  'metric_values'
)
ORDER BY tablename;

-- ESPERADO: 6 rows (todos los nombres de tabla)


-- ============================================================================
-- 📋 VALIDACIÓN 2: Verificar que RLS está habilitado
-- ============================================================================
SELECT
  'RLS ENABLED' as check_type,
  relname as table_name,
  CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END as rls_enabled,
  CASE WHEN relrowsecurity THEN 'PASS ✓' ELSE 'FAIL ✗' END as status
FROM pg_class
WHERE relname IN (
  'dashboard_layouts',
  'dashboard_configs',
  'dashboard_shares', 
  'dashboard_templates',
  'custom_metrics',
  'metric_values'
)
ORDER BY relname;

-- ESPERADO: 6 rows, todos con rls_enabled = YES


-- ============================================================================
-- 📋 VALIDACIÓN 3: Verificar que todas las funciones existen
-- ============================================================================
SELECT
  'FUNCTIONS' as check_type,
  proname as function_name,
  (pronargs || ' params') as details,
  'EXISTS' as status
FROM pg_proc 
WHERE proname IN (
  'update_dashboard_layouts_timestamp',
  'update_dashboard_configs_timestamp',
  'update_dashboard_templates_timestamp',
  'update_custom_metrics_timestamp',
  'generate_share_token',
  'generate_share_token_if_null',
  'get_shared_dashboard_layout'
) AND prokind = 'f'
ORDER BY proname;

-- ESPERADO: 7 rows (funciones)


-- ============================================================================
-- 📋 VALIDACIÓN 4: Verificar que todos los triggers existen
-- ============================================================================
SELECT
  'TRIGGERS' as check_type,
  trigger_name,
  event_object_table as table_name,
  'EXISTS' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table IN (
    'dashboard_layouts',
    'dashboard_configs',
    'dashboard_shares',
    'dashboard_templates',
    'custom_metrics'
  )
ORDER BY event_object_table, trigger_name;

-- ESPERADO: 5 rows (un trigger por tabla)


-- ============================================================================
-- 📋 VALIDACIÓN 5: Verificar que todas las RLS policies existen
-- ============================================================================
SELECT
  'RLS POLICIES' as check_type,
  tablename,
  policyname,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'dashboard_layouts',
    'dashboard_configs',
    'dashboard_shares',
    'dashboard_templates',
    'custom_metrics',
    'metric_values'
  )
GROUP BY tablename, policyname
ORDER BY tablename, policyname;

-- ESPERADO: Múltiples policies por tabla (mínimo 2-3 por tabla)


-- ============================================================================
-- 📋 VALIDACIÓN 6: Verificar présets Templates cargados
-- ============================================================================
SELECT
  'PRESETS DATA' as check_type,
  name as template_name,
  category,
  is_preset,
  (jsonb_array_length(widgets_data->'widgets')::text || ' widgets') as widget_count,
  'LOADED' as status
FROM dashboard_templates
WHERE is_preset = TRUE
ORDER BY name;

-- ESPERADO: 5 rows (los 5 templates predefinidos)
-- - Executive
-- - Finance Dashboard
-- - Minimal
-- - Operations
-- - Sales Overview


-- ============================================================================
-- 📋 VALIDACIÓN 7: Verificar integridad de Foreign Keys
-- ============================================================================
SELECT
  'FOREIGN KEYS' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  'EXISTS' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'dashboard_layouts',
    'dashboard_configs',
    'dashboard_shares',
    'dashboard_templates',
    'custom_metrics',
    'metric_values'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ESPERADO: Múltiples foreign keys (4-5 por tabla)


-- ============================================================================
-- 📋 VALIDACIÓN 8: Verificar índices para performance
-- ============================================================================
SELECT
  'INDEXES' as check_type,
  schemaname,
  tablename,
  indexname,
  'DEFINED' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'dashboard_layouts',
    'dashboard_configs',
    'dashboard_shares',
    'dashboard_templates',
    'custom_metrics',
    'metric_values'
  )
ORDER BY tablename, indexname;

-- ESPERADO: Múltiples índices (mínimo 2-3 por tabla)


-- ============================================================================
-- 📋 VALIDACIÓN 9: Verificar tamaño de tablas (todas vacías es correcto)
-- ============================================================================
SELECT
  'TABLE SIZES' as check_type,
  schemaname || '.' || relname as full_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as size,
  n_live_tup::text || ' rows' as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN (
    'dashboard_layouts',
    'dashboard_configs',
    'dashboard_shares',
    'dashboard_templates',
    'custom_metrics',
    'metric_values'
  )
ORDER BY relname;

-- ESPERADO: Todos vacíos excepto dashboard_templates (5 presets)
-- - dashboard_configs: 0 rows
-- - dashboard_layouts: 0 rows
-- - dashboard_shares: 0 rows
-- - dashboard_templates: 5 rows
-- - custom_metrics: 0 rows
-- - metric_values: 0 rows


-- ============================================================================
-- 📋 VALIDACIÓN 10: Test Simple - Intentar insertar row (debería fallar si RLS funciona)
-- ============================================================================
-- ADVERTENCIA: Este test crea datos. Comentado por seguridad.
-- Descomenta solo si quieres verificar RLS en acción.

/*
INSERT INTO dashboard_layouts 
  (user_id, company_id, widgets, is_default)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '[]', false);

-- Debería fallar con error RLS si funciona correctamente
-- Error: "new row violates row-level security policy for table \"dashboard_layouts\""
*/


-- ============================================================================
-- 🎯 RESUMEN FINAL
-- ============================================================================
-- Si todas las validaciones anteriores muestran resultados esperados, entonces:
-- ✅ Las migraciones se ejecutaron correctamente
-- ✅ RLS está habilitado y funcionando
-- ✅ Triggers están configurados
-- ✅ Índices están optimizados
-- ✅ Presets están cargados
-- ✅ Listo para usar en la aplicación
