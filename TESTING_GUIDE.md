# 🧪 Guía Completa de Testing - Sprint de Seguridad

Esta guía te permite ejecutar **todos los tests** implementados hasta el momento (Tasks 1-9).

---

## 📋 Resumen de Tests Implementados

| Task | Archivo de Test | Tests | Status |
|------|----------------|-------|--------|
| 1️⃣ XSS Prevention | `sanitization.test.ts` | 10 | ✅ |
| 4️⃣ Input Validation | `input-validation.test.ts` | 14 | ✅ |
| 5️⃣ Rate Limiting | `rate-limiting.test.ts` | 12 | ✅ |
| 6️⃣ Race Condition Fix | `race-condition-optimistic-locking.test.ts` | 8 | ✅ |
| 7️⃣ Email Validation | `email-validation.test.ts` | 15 | ✅ |
| 9️⃣ CORS Policy | `cors-policy.test.ts` | 14 | ✅ |
| **TOTAL** | **6 archivos** | **73 tests** | ✅ |

---

## 🚀 Ejecución Rápida - Todos los Tests

### Opción 1: Ejecutar Todos los Tests (Recomendado)

```powershell
# Navegar al directorio raíz del proyecto
cd "c:\Users\juanm\OneDrive\Desktop\Trabajo\App Finanzas\Main\dsfp_space"

# Ejecutar todos los tests de Edge Functions (Tasks 1, 4, 5, 7, 9)
Write-Host "`n=== Task 1: XSS Prevention ===" -ForegroundColor Cyan
deno test --allow-net --allow-env supabase/functions/send-crm-message/sanitization.test.ts

Write-Host "`n=== Task 4: Input Validation ===" -ForegroundColor Cyan
deno test --allow-net --allow-env supabase/functions/send-crm-message/input-validation.test.ts

Write-Host "`n=== Task 5: Rate Limiting ===" -ForegroundColor Cyan
deno test --allow-net --allow-env supabase/functions/send-crm-message/rate-limiting.test.ts

Write-Host "`n=== Task 7: Email Validation ===" -ForegroundColor Cyan
deno test --allow-net --allow-env supabase/functions/send-crm-message/email-validation.test.ts

Write-Host "`n=== Task 9: CORS Policy ===" -ForegroundColor Cyan
deno test --allow-net --allow-env supabase/functions/send-crm-message/cors-policy.test.ts

# Nota: Task 6 (Race Condition) está en TypeScript para frontend
Write-Host "`n=== Task 6: Race Condition Fix ===" -ForegroundColor Cyan
Write-Host "⚠️  Este test requiere frontend build. Verificar manualmente o usar npm test." -ForegroundColor Yellow
```

### Opción 2: Script Todo-en-Uno

```powershell
# Guardar este script como run-all-tests.ps1

$tests = @(
    @{ Name = "Task 1: XSS Prevention"; Path = "supabase/functions/send-crm-message/sanitization.test.ts" },
    @{ Name = "Task 4: Input Validation"; Path = "supabase/functions/send-crm-message/input-validation.test.ts" },
    @{ Name = "Task 5: Rate Limiting"; Path = "supabase/functions/send-crm-message/rate-limiting.test.ts" },
    @{ Name = "Task 7: Email Validation"; Path = "supabase/functions/send-crm-message/email-validation.test.ts" },
    @{ Name = "Task 9: CORS Policy"; Path = "supabase/functions/send-crm-message/cors-policy.test.ts" }
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    Write-Host "`n===============================================" -ForegroundColor Cyan
    Write-Host "  $($test.Name)" -ForegroundColor Cyan
    Write-Host "===============================================`n" -ForegroundColor Cyan
    
    deno test --allow-net --allow-env $test.Path
    
    if ($LASTEXITCODE -eq 0) {
        $passed++
        Write-Host "✅ PASSED`n" -ForegroundColor Green
    } else {
        $failed++
        Write-Host "❌ FAILED`n" -ForegroundColor Red
    }
}

Write-Host "`n===============================================" -ForegroundColor Yellow
Write-Host "  SUMMARY" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "Passed: $passed / $($tests.Count)" -ForegroundColor Green
Write-Host "Failed: $failed / $($tests.Count)" -ForegroundColor Red
```

---

## 📝 Ejecución Individual por Task

### ✅ Task 1: XSS Prevention (10 tests)

```powershell
deno test --allow-net --allow-env supabase/functions/send-crm-message/sanitization.test.ts
```

**Qué verifica:**
- Sanitización de `<script>` tags
- Escape de atributos maliciosos (`onerror`, `onload`)
- Remoción de `<iframe>` e `<embed>`
- Preservación de contenido HTML legítimo

**Expected Output:**
```
✅ 1.1 - Normal text passes through
✅ 1.2 - Script tags are removed
✅ 1.3 - Event handlers are escaped
...
✅ All 10 test scenarios passed!
```

---

### ✅ Task 4: Input Validation (14 tests)

```powershell
deno test --allow-net --allow-env supabase/functions/send-crm-message/input-validation.test.ts
```

**Qué verifica:**
- Validación de UUID para `log_id`
- Enum validation para `channel` (email, whatsapp, sms)
- Email format validation
- Body max length (5000 chars)
- Required fields

**Expected Output:**
```
✅ 4.1 - Valid payload passes validation
✅ 4.2 - Invalid UUID is rejected
✅ 4.3 - Invalid email is rejected
...
✅ All 14 test scenarios passed!
```

---

### ✅ Task 5: Rate Limiting (12 tests)

```powershell
deno test --allow-net --allow-env supabase/functions/send-crm-message/rate-limiting.test.ts
```

**Qué verifica:**
- 10 requests/min limit enforcement
- Retry-After header presence
- Per-user isolation (different users, different limits)
- JWT extraction correctness
- Fail-open behavior (allows if Redis down)
- Sliding window boundary handling

**Expected Output:**
```
✅ 5.1 - First 10 rapid requests succeed
✅ 5.2 - 11th request returns 429
✅ 5.3 - Retry-After header present
...
✅ All 12 test scenarios passed!
```

---

### ✅ Task 6: Race Condition Fix (8 tests)

```powershell
# Este test está en TypeScript y requiere build/execution especial
# Opción 1: Ejecutar con ts-node si está instalado
npx ts-node src/domain/crm/services/race-condition-optimistic-locking.test.ts

# Opción 2: Compilar y ejecutar
tsc src/domain/crm/services/race-condition-optimistic-locking.test.ts
node src/domain/crm/services/race-condition-optimistic-locking.test.js

# Opción 3: Usar Vitest/Jest si está configurado
npm test -- race-condition-optimistic-locking.test.ts
```

**Qué verifica:**
- Optimistic locking con `updated_at` timestamp
- Retry mechanism (max 3 attempts)
- Concurrent update detection
- Performance (<200ms for single update)
- Fallback to non-locking update after max retries

**Expected Output:**
```
✅ 6.1 - Normal single update succeeds
✅ 6.2 - Concurrent update detected and retried
✅ 6.3 - No silent failures
...
✅ All 8 test scenarios passed!
```

---

### ✅ Task 7: Email Validation (15 tests)

```powershell
deno test --allow-net --allow-env supabase/functions/send-crm-message/email-validation.test.ts
```

**Qué verifica:**
- Email format regex validation (11 tests)
- Authorization: recipient matches customer_email (4 tests)
- Case-insensitive email matching
- Rejection of invalid emails (missing @, domain, TLD)

**Expected Output:**
```
✅ 7.1 - Valid email accepted
✅ 7.2 - Invalid email rejected (missing @)
✅ 7.3 - Unauthorized recipient rejected
...
✅ All 15 test scenarios passed!
```

---

### ✅ Task 9: CORS Restrictive Policy (14 tests)

```powershell
deno test --allow-net --allow-env supabase/functions/send-crm-message/cors-policy.test.ts
```

**Qué verifica:**
- Origin allowlist enforcement
- Environment variable parsing (`ALLOWED_ORIGINS`)
- Exact matching (case-sensitive, protocol-aware, port-specific)
- Subdomain isolation
- Wildcard backwards compatibility
- OPTIONS preflight caching

**Expected Output:**
```
✅ 9.1 - Allowed origin accepted
✅ 9.2 - Disallowed origin rejected
✅ 9.3 - Missing origin header handled
...
✅ All 14 test scenarios passed!
```

---

## 🔍 Tests Manuales e Integración

### Task 2: RLS Policies (Manual Testing)

**Setup:**
1. Conectar a Supabase con dos usuarios diferentes (User A, User B)
2. User A crea una oportunidad (company_id = A)
3. User B intenta acceder a la oportunidad de User A

**Expected Result:**
```sql
-- User B ejecuta:
SELECT * FROM crm_opportunities WHERE id = '<opportunity_id_from_user_a>';
-- Resultado: 0 rows (RLS bloqueó acceso)
```

**Tests a ejecutar:**
```sql
-- Test 1: Cross-tenant SELECT blocked
-- Login como User B
SELECT * FROM crm_opportunities WHERE company_id != auth.jwt() -> 'company_id';
-- Expected: 0 rows

-- Test 2: Cross-tenant UPDATE blocked
UPDATE crm_opportunities 
SET title = 'Hacked!' 
WHERE company_id != auth.jwt() -> 'company_id';
-- Expected: 0 rows updated

-- Test 3: Cross-tenant DELETE blocked
DELETE FROM crm_opportunities 
WHERE company_id != auth.jwt() -> 'company_id';
-- Expected: 0 rows deleted

-- Test 4: Same-tenant operations allowed
SELECT * FROM crm_opportunities WHERE company_id = auth.jwt() -> 'company_id';
-- Expected: User's opportunities returned
```

---

### Task 3: Credentials Encryption (Manual Testing)

**Pre-requisitos:**
1. Verificar que el encryption key existe:
   ```powershell
   supabase secrets list
   # Debe incluir: WHATSAPP_ENCRYPTION_KEY
   ```

2. Agregar credenciales de prueba:
   ```sql
   -- Estas se deben auto-encriptar via trigger
   INSERT INTO crm_whatsapp_credentials (company_id, account_sid, auth_token, phone_number)
   VALUES ('your-company-id', 'AC123...', 'test_token', '+1234567890');
   ```

3. Verificar que están encriptadas:
   ```sql
   SELECT 
     company_id,
     account_sid_encrypted IS NOT NULL as has_encrypted_sid,
     auth_token_encrypted IS NOT NULL as has_encrypted_token,
     account_sid, -- Debe ser NULL
     auth_token -- Debe ser NULL
   FROM crm_whatsapp_credentials 
   WHERE company_id = 'your-company-id';
   ```

**Expected Result:**
```
has_encrypted_sid: true
has_encrypted_token: true
account_sid: NULL
auth_token: NULL
```

4. Probar decryption desde edge function:
   ```powershell
   # Enviar un mensaje de prueba
   curl -X POST "http://localhost:54321/functions/v1/send-crm-message" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "log_id": "valid-uuid-here",
       "channel": "whatsapp",
       "recipient": "customer@example.com",
       "body": "Test message"
     }'
   ```

**Expected:** Mensaje enviado exitosamente (credentials decrypted in-memory)

---

### Task 8: Auditoría de Cambios (Manual Testing)

**Test 1: Single Update Logging**
1. Abrir UI de CRM
2. Editar una oportunidad (cambiar título, monto, etc.)
3. Guardar
4. Abrir la oportunidad → Tab "Historial"

**Expected:** Ver entrada nueva con:
- Acción: "Oportunidad actualizada"
- Usuario: Tu nombre
- Timestamp reciente
- Detalles de cambios

**Test 2: Bulk Edit Logging**
1. Seleccionar múltiples oportunidades (checkbox)
2. Click "Edit Selected" (bulk edit)
3. Cambiar un campo común (e.g., stage)
4. Guardar
5. Abrir cada oportunidad → Tab "Historial"

**Expected:** Cada oportunidad tiene entrada de log individual

**Test 3: Bulk Delete Logging**
1. Seleccionar oportunidades para eliminar
2. Click "Delete Selected"
3. Confirmar
4. Verificar en `crm_activity_log`:
   ```sql
   SELECT * FROM crm_activity_log 
   WHERE action = 'Oportunidad eliminada'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

**Expected:** Entradas de log para cada oportunidad eliminada

---

## 🔧 Troubleshooting

### Error: "Deno not found"
```powershell
# Instalar Deno
irm https://deno.land/install.ps1 | iex

# O usar winget
winget install DenoLand.Deno
```

### Error: "Cannot find module 'supabase'"
```powershell
# Los tests de Deno no requieren instalación de módulos
# Verificar que estás en el directorio correcto
cd "c:\Users\juanm\OneDrive\Desktop\Trabajo\App Finanzas\Main\dsfp_space"
```

### Error: "Test failed with exit code 1"
```powershell
# Ver output detallado
deno test --allow-net --allow-env --log-level debug supabase/functions/send-crm-message/sanitization.test.ts
```

### Error: "UPSTASH_REDIS_REST_URL not set" (Rate Limiting Tests)
```powershell
# Configurar variables temporales para tests
$env:UPSTASH_REDIS_REST_URL = "https://your-redis-url.upstash.io"
$env:UPSTASH_REDIS_REST_TOKEN = "your-token-here"

# Ejecutar tests
deno test --allow-net --allow-env supabase/functions/send-crm-message/rate-limiting.test.ts
```

---

## 📊 Checklist de Validación Completa

Usa este checklist para verificar que todo funciona:

```
CRÍTICO (Semana 1):
[x] Task 1: XSS Prevention
    [x] 10/10 unit tests passing
    [x] Malicious scripts blocked
    [x] Valid HTML preserved

[x] Task 2: RLS Policies
    [x] Cross-tenant SELECT blocked
    [x] Cross-tenant UPDATE blocked
    [x] Cross-tenant DELETE blocked
    [x] Same-tenant operations allowed

[x] Task 3: Credentials Encryption
    [x] Encryption key exists in secrets
    [x] Credentials auto-encrypted on INSERT
    [x] Edge function can decrypt successfully
    [x] Plaintext columns are NULL

[x] Task 4: Input Validation
    [x] 14/14 unit tests passing
    [x] Invalid UUIDs rejected
    [x] Invalid emails rejected
    [x] Oversized payloads rejected

[x] Task 5: Rate Limiting
    [x] 12/12 unit tests passing
    [x] 10 req/min limit enforced
    [x] 429 status returned after limit
    [x] Retry-After header present
    [x] Per-user isolation works

[x] Task 6: Race Condition Fix
    [x] 8/8 unit tests passing
    [x] Optimistic locking detects conflicts
    [x] Retry mechanism works (max 3)
    [x] No silent failures

[x] Task 7: Email Validation
    [x] 15/15 unit tests passing
    [x] Format validation works
    [x] Authorization check works
    [x] Case-insensitive matching

ALTO (Semana 2):
[x] Task 8: Auditoría de Cambios
    [x] Single update creates log
    [x] Bulk edit creates multiple logs
    [x] Bulk delete creates delete logs
    [x] History tab shows entries

[x] Task 9: CORS Restrictive Policy
    [x] 14/14 unit tests passing
    [x] Allowed origins accepted
    [x] Disallowed origins rejected
    [x] Exact matching enforced
```

---

## 🎯 Next Steps

Después de ejecutar todos los tests:

1. **Si todos pasan:** Ready para Task 10 (Error Handling Improvements)
2. **Si alguno falla:** 
   - Revisar output del test
   - Verificar configuración (env vars, secrets)
   - Consultar troubleshooting arriba
   - Abrir issue si es bug real

---

## 📚 Recursos Adicionales

- **Setup Guides:**
  - [RATE_LIMITING_SETUP.md](./RATE_LIMITING_SETUP.md) - Configuración de Upstash
  - [CORS_POLICY_SETUP.md](./CORS_POLICY_SETUP.md) - Configuración de origins
  - [COMPANY_TWILIO_SETUP.md](./COMPANY_TWILIO_SETUP.md) - Agregar credenciales

- **Implementation Docs:**
  - [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Estado de todas las tasks

---

**Última Actualización:** March 6, 2026  
**Autor:** Security Sprint Team  
**Versión:** 1.0
