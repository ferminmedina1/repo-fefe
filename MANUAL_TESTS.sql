-- ============================================================================
-- MANUAL TESTS - Security Sprint (Tasks 2, 3, 8)
-- Ejecutar estos queries en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TASK 2: RLS POLICIES VALIDATION
-- ============================================================================

-- Test 2.1: Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('crm_opportunities', 'crm_pipelines', 'crm_message_logs', 'crm_activity_log');
-- Expected: rowsecurity = true para todas las tablas

-- Test 2.2: Ver políticas RLS activas
SELECT schemaname, tablename, policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('crm_opportunities', 'crm_pipelines', 'crm_message_logs', 'crm_activity_log')
ORDER BY tablename, policyname;
-- Expected: Múltiples políticas (SELECT, INSERT, UPDATE, DELETE) por tabla

-- Test 2.3: Cross-tenant SELECT blocked (necesita dos usuarios diferentes)
-- Usuario A ejecuta:
SELECT COUNT(*) as my_opportunities
FROM crm_opportunities 
WHERE company_id = (auth.jwt() -> 'company_id')::text::uuid;
-- Expected: Ver tus oportunidades

-- Intentar acceder a otra company (debe fallar por RLS):
SELECT COUNT(*) as other_company_opportunities
FROM crm_opportunities 
WHERE company_id != (auth.jwt() -> 'company_id')::text::uuid;
-- Expected: 0 rows (RLS bloqueó acceso)

-- Test 2.4: Bulk operations con company_id check
-- Crear oportunidad de prueba
INSERT INTO crm_opportunities (
  company_id,
  pipeline_id,
  title,
  customer_name,
  customer_email,
  amount,
  stage
)
VALUES (
  (auth.jwt() -> 'company_id')::text::uuid,
  'tu-pipeline-id',  -- Reemplazar con pipeline_id válido
  'Test Opportunity - RLS Check',
  'Test Customer',
  'test@example.com',
  1000.00,
  'prospecting'
);

-- Verificar que solo ves oportunidades de tu company
SELECT id, title, company_id 
FROM crm_opportunities 
WHERE title = 'Test Opportunity - RLS Check';
-- Expected: 1 row con tu company_id

-- Cleanup (eliminar test data)
DELETE FROM crm_opportunities 
WHERE title = 'Test Opportunity - RLS Check';


-- ============================================================================
-- TASK 3: CREDENTIALS ENCRYPTION VALIDATION
-- ============================================================================

-- Test 3.1: Verificar estructura de tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_whatsapp_credentials'
ORDER BY ordinal_position;
-- Expected: Ver columnas *_encrypted (bytea type)

-- Test 3.2: Verificar que pgcrypto extension existe
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pgcrypto';
-- Expected: pgcrypto | version

-- Test 3.3: Verificar funciones de encrypt/decrypt
SELECT proname 
FROM pg_proc 
WHERE proname IN ('encrypt_whatsapp_credentials', 'decrypt_whatsapp_credentials');
-- Expected: Ambas funciones existen

-- Test 3.4: Agregar credencial de prueba
-- IMPORTANTE: Reemplazar 'tu-company-id' con un company_id real
INSERT INTO crm_whatsapp_credentials (
  company_id, 
  account_sid, 
  auth_token, 
  phone_number
)
VALUES (
  'tu-company-id-aqui',  -- ⚠️ REEMPLAZAR con company_id válido
  'ACtest1234567890abcdef',
  'test_secret_token_12345',
  '+1234567890'
)
ON CONFLICT (company_id) 
DO UPDATE SET
  account_sid = EXCLUDED.account_sid,
  auth_token = EXCLUDED.auth_token,
  phone_number = EXCLUDED.phone_number;

-- Test 3.5: Verificar que se auto-encriptó via trigger
SELECT 
  company_id,
  account_sid_encrypted IS NOT NULL as sid_encrypted,
  auth_token_encrypted IS NOT NULL as token_encrypted,
  account_sid as sid_plaintext,  -- Debe ser NULL
  auth_token as token_plaintext, -- Debe ser NULL
  phone_number -- Este es plaintext OK (no sensible)
FROM crm_whatsapp_credentials
WHERE company_id = 'tu-company-id-aqui';  -- ⚠️ REEMPLAZAR

-- Expected output:
-- sid_encrypted: true
-- token_encrypted: true
-- sid_plaintext: NULL
-- token_plaintext: NULL
-- phone_number: +1234567890

-- Test 3.6: Verificar trigger de auto-encryption
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'crm_whatsapp_credentials'::regclass;
-- Expected: Ver trigger auto_encrypt_whatsapp_credentials

-- Test 3.7: Verificar audit log table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'crm_whatsapp_credentials_audit'
ORDER BY ordinal_position;
-- Expected: Ver columnas de auditoría (action, changed_at, changed_by, etc.)

-- Cleanup (opcional - eliminar test data)
-- DELETE FROM crm_whatsapp_credentials WHERE company_id = 'tu-company-id-aqui';


-- ============================================================================
-- TASK 8: AUDITORÍA DE CAMBIOS (ACTIVITY LOG) VALIDATION
-- ============================================================================

-- Test 8.1: Verificar tabla de activity log existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'crm_activity_log'
ORDER BY ordinal_position;
-- Expected: Ver columnas (id, opportunity_id, action, details, created_by, etc.)

-- Test 8.2: Verificar RLS en activity log
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'crm_activity_log';
-- Expected: Ver políticas INSERT y SELECT

-- Test 8.3: Ver logs recientes
SELECT 
  id,
  opportunity_id,
  action,
  details,
  created_by,
  created_at
FROM crm_activity_log
ORDER BY created_at DESC
LIMIT 10;
-- Expected: Ver entradas de log de operaciones recientes

-- Test 8.4: Crear test log entry (simulando una actualización)
-- IMPORTANTE: Reemplazar con opportunity_id válido
INSERT INTO crm_activity_log (
  opportunity_id,
  action,
  details,
  created_by,
  company_id
)
VALUES (
  'tu-opportunity-id-aqui',  -- ⚠️ REEMPLAZAR con opportunity_id válido
  'Test: Manual log entry',
  'Testing activity log functionality',
  auth.uid(),
  (auth.jwt() -> 'company_id')::text::uuid
);

-- Test 8.5: Verificar que el log se creó
SELECT *
FROM crm_activity_log
WHERE action = 'Test: Manual log entry'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: Ver la entrada creada

-- Test 8.6: Verificar logs por oportunidad específica
SELECT 
  action,
  details,
  created_at,
  created_by
FROM crm_activity_log
WHERE opportunity_id = 'tu-opportunity-id-aqui'  -- ⚠️ REEMPLAZAR
ORDER BY created_at DESC;
-- Expected: Ver historial completo de esa oportunidad

-- Test 8.7: Bulk operation logs (verificar que hay múltiples logs)
-- Este test requiere ejecutar bulk edit desde la UI primero
SELECT 
  opportunity_id,
  action,
  created_at
FROM crm_activity_log
WHERE action LIKE 'Oportunidad actualizada%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
-- Expected: Ver múltiples entradas si se hizo bulk edit reciente

-- Cleanup (eliminar test data)
DELETE FROM crm_activity_log 
WHERE action = 'Test: Manual log entry';


-- ============================================================================
-- ADDITIONAL VALIDATION QUERIES
-- ============================================================================

-- Ver todas las tablas con RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- Ver todas las extensiones instaladas
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

-- Ver todas las funciones custom (RPC)
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname LIKE '%whatsapp%'
ORDER BY proname;

-- ============================================================================
-- VALIDATION CHECKLIST
-- ============================================================================

/*
□ Task 2 - RLS Policies:
  □ RLS habilitado en todas las tablas CRM
  □ Políticas SELECT/INSERT/UPDATE/DELETE existen
  □ Cross-tenant access bloqueado (0 rows cuando company_id diferente)
  □ Same-tenant access permitido

□ Task 3 - Credentials Encryption:
  □ Tabla crm_whatsapp_credentials existe
  □ Columnas *_encrypted (bytea) existen
  □ pgcrypto extension instalada
  □ Funciones encrypt/decrypt existen
  □ Trigger auto_encrypt_whatsapp_credentials activo
  □ Plaintext credentials = NULL después de INSERT
  □ Encrypted credentials IS NOT NULL
  □ Audit table existe

□ Task 8 - Activity Log:
  □ Tabla crm_activity_log existe
  □ RLS policies en activity log
  □ Logs se crean automáticamente en updates
  □ Bulk operations crean múltiples logs
  □ UI muestra logs en tab "Historial"

SUCCESS CRITERIA:
- Todos los checkboxes marcados ✓
- Queries ejecutan sin errores
- Expected outputs coinciden con resultados reales
*/
