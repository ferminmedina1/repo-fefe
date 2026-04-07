# 🛠️ QUICK FIX GUIDE - Critical & Alto Priority
## Implementación Rápida de Vulnerabilidades

---

## 1️⃣ FIX CRÍTICO: XSS Prevention en send-crm-message

**Archivo:** `supabase/functions/send-crm-message/index.ts`

```typescript
// ✅ CAMBIO REQUERIDO - Línea 44

// ANTES (❌ Vulnerable):
const html = `<p>${body}</p>`;

// DESPUÉS (✅ Seguro):
import { DOMPurify } from "https://esm.sh/isomorphic-dompurify";  // Add import

// En la función:
const sanitizedBody = DOMPurify.sanitize(body);
const html = `<p>${sanitizedBody}</p>`;

// Opción alternativa SIN dependencia externa:
const escapeHtml = (text: string) => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

const sanitizedBody = escapeHtml(body);
const html = `<p>${sanitizedBody}</p>`;
```

**Test:**
```typescript
const testPayload = {
  log_id: "test-id",
  channel: "email",
  recipient: "test@example.com",
  body: '<img src=x onerror="alert(\'xss\')">'
};

// Debería ser escapado a: &lt;img src=x onerror=...
```

---

## 2️⃣ FIX CRÍTICO: RLS Policies en Supabase

**Ubicación:** Supabase Dashboard > SQL Editor

```sql
-- 📝 CREAR POLICY PARA crm_opportunities
CREATE POLICY "Users can only access their company opportunities"
  ON crm_opportunities
  FOR ALL
  USING (company_id = auth.jwt() -> 'company_id');

-- 📝 CREAR POLICY PARA crm_pipelines
CREATE POLICY "Users can only access their company pipelines"
  ON crm_pipelines
  FOR ALL
  USING (company_id = auth.jwt() -> 'company_id');

-- 📝 CREAR POLICY PARA crm_message_logs
CREATE POLICY "Users can only access their company message logs"
  ON crm_message_logs
  FOR ALL
  USING (company_id = auth.jwt() -> 'company_id');

-- ✅ Verificar que está habilitado:
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_message_logs ENABLE ROW LEVEL SECURITY;

-- 📝 TEST - Debería fallar:
SELECT * FROM crm_opportunities WHERE company_id != auth.jwt() -> 'company_id';
```

---

## 3️⃣ FIX CRÍTICO: Encriptar Credentials Twilio

**Opción A: Usar Supabase Vault (RECOMENDADO)**

```typescript
// 🔐 En supabase/functions/send-crm-message/index.ts

// ANTES (❌):
const { data: creds } = await supabase
  .from("crm_whatsapp_credentials")
  .select("account_sid, auth_token, phone_number")
  .eq("company_id", companyId)
  .single();

// DESPUÉS (✅):
// 1. Usar Supabase Vault:
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

// O 2. Si necesitas por company:
const secretName = `twilio_creds_${companyId}`;
const secret = Deno.env.get(secretName);

// O 3. Usar vaults de Supabase:
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // Solo en server
);

const { data: creds, error } = await supabaseAdmin
  .rpc('get_decrypted_whatsapp_creds', { company_id: companyId });

if (error) {
  throw new Error("No puedo acceder a credenciales encriptadas");
}

const TWILIO_ACCOUNT_SID = creds.account_sid;  // Ya desencriptado en el servidor
```

**Opción B: Encriptar en Tabla**

```sql
-- 1. Agregar extension:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Agregar columnas encriptadas:
ALTER TABLE crm_whatsapp_credentials
ADD COLUMN account_sid_enc bytea,
ADD COLUMN auth_token_enc bytea;

-- 3. Crear función helper:
CREATE OR REPLACE FUNCTION encrypt_credential(credential TEXT, key TEXT)
RETURNS bytea AS $$
BEGIN
  RETURN pgp_sym_encrypt(credential, key);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_credential(credential bytea, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(credential, key);
END;
$$ LANGUAGE plpgsql;

-- 4. En aplicación:
const encryptionKey = Deno.env.get("ENCRYPTION_KEY");

// Guardar:
const { error } = await supabaseAdmin
  .from("crm_whatsapp_credentials")
  .update({
    account_sid_enc: await supabaseAdmin
      .rpc('encrypt_credential', { 
        credential: account_sid, 
        key: encryptionKey 
      })
  })
  .eq("company_id", companyId);

// Leer:
const { data: creds } = await supabaseAdmin
  .from("crm_whatsapp_credentials")
  .select("account_sid_enc, auth_token_enc, phone_number")
  .eq("company_id", companyId)
  .single();

const decryptedSid = await supabaseAdmin
  .rpc('decrypt_credential', { 
    credential: creds.account_sid_enc, 
    key: encryptionKey 
  });
```

---

## 4️⃣ FIX CRÍTICO: Validar Input en Edge Functions

**Archivo:** `supabase/functions/send-crm-message/index.ts`

```typescript
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";  // Add import

// Agregar validación:
const messageRequestSchema = z.object({
  log_id: z.string().uuid("log_id debe ser UUID válido"),
  channel: z.enum(["email", "whatsapp"], { 
    description: "canal debe ser 'email' o 'whatsapp'" 
  }),
  recipient: z.string()
    .email("Email inválido")
    .max(254, "Email demasiado largo"),  // RFC 5321
  subject: z.string().max(1000).nullable().optional(),
  body: z.string()
    .min(1, "Cuerpo no puede estar vacío")
    .max(5000, "Cuerpo demasiado largo (máx 5000 chars)"),
});

serve(async (req: Request) => {
  // ... CORS check ...

  try {
    // Reemplazar:
    // const payload = (await req.json()) as CRMMessageRequest;
    
    // Por:
    const payload = messageRequestSchema.parse(await req.json());
    
    const { log_id, channel, recipient, subject, body } = payload;
    
    // ... rest of function ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: "Validación fallida",
          details: error.errors.map(e => e.message)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.error("[send-crm-message] Error:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar solicitud" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 5️⃣ FIX CRÍTICO: Rate Limiting

**Opción A: Supabase Edge Function con Upstash**

```typescript
// En deno.json agregar:
{
  "imports": {
    "@upstash/ratelimit": "https://esm.sh/@upstash/ratelimit@0.4.4",
    "@upstash/redis": "https://esm.sh/@upstash/redis@1.25.0"
  }
}

// En supabase/functions/send-crm-message/index.ts:
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),  // 10 mensajes por minuto
  analytics: true,
});

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const userIdentifier = parseUserIdFromJWT(authHeader);  // O usar IP
  
  const { success, remaining, reset } = await ratelimit.limit(userIdentifier);
  
  if (!success) {
    return new Response(
      JSON.stringify({ 
        error: "Rate limit exceeded", 
        retry_after: Math.ceil((reset - Date.now()) / 1000) 
      }),
      { 
        status: 429,
        headers: { 
          ...corsHeaders,
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          "Content-Type": "application/json"
        }
      }
    );
  }
  
  // ... continue ...
});
```

**Opción B: Cliente (React)**

```typescript
// src/hooks/useRateLimiter.ts
import { useRef } from 'react';

export function useRateLimiter(maxRequests: number = 10, windowMs: number = 60000) {
  const requestTimesRef = useRef<number[]>([]);

  return {
    isAllowed: () => {
      const now = Date.now();
      const cutoff = now - windowMs;
      
      // Limpiar requests antiguos
      requestTimesRef.current = requestTimesRef.current.filter(t => t > cutoff);
      
      if (requestTimesRef.current.length >= maxRequests) {
        return false;
      }
      
      requestTimesRef.current.push(now);
      return true;
    },
    getRemainingRequests: () => {
      const now = Date.now();
      const cutoff = now - windowMs;
      requestTimesRef.current = requestTimesRef.current.filter(t => t > cutoff);
      return Math.max(0, maxRequests - requestTimesRef.current.length);
    }
  };
}

// Usar en componente:
const { isAllowed, getRemainingRequests } = useRateLimiter(5);  // 5 por minuto

const sendMessage = async () => {
  if (!isAllowed()) {
    toast.error(`Espera antes de enviar otro mensaje. Intentos restantes: ${getRemainingRequests()}`);
    return;
  }
  
  await messageMutation.mutate();
};
```

---

## 6️⃣ FIX CRÍTICO: Validar company_id en Bulk Operations

**Archivo:** `src/components/crm/OpportunitiesList.tsx`

```typescript
// ANTES (❌ Vulnerable):
const bulkDeleteMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase
      .from("crm_opportunities")
      .delete()
      .in("id", Array.from(selectedIds));  // ⚠️ Sin validación
    if (error) throw error;
  },
  // ...
});

// DESPUÉS (✅ Seguro):
const bulkDeleteMutation = useMutation({
  mutationFn: async () => {
    // Verificar que TODOS los IDs pertenecen a esta company
    const { data: opportunities, error: fetchError } = await supabase
      .from("crm_opportunities")
      .select("id")
      .eq("company_id", companyId)  // ✅ Validar company
      .in("id", Array.from(selectedIds));
    
    if (fetchError) throw fetchError;
    
    // Verificar que la cantidad coincide (seguridad extra)
    if (opportunities.length !== selectedIds.size) {
      throw new Error("Algunos IDs no pertenecen a tu empresa");
    }
    
    // Ahora sí, eliminar
    const { error } = await supabase
      .from("crm_opportunities")
      .delete()
      .eq("company_id", companyId)  // ✅ REQUERIDO
      .in("id", Array.from(selectedIds));
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["opportunities", companyId] });
    setSelectedIds(new Set());
    toast.success("Oportunidades eliminadas");
  },
  onError: (e: any) => toast.error(e.message),
});

// ✅ Aplicar al EDIT también:
const bulkEditMutation = useMutation({
  mutationFn: async () => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (bulkStage) updates.stage = bulkStage;
    if (bulkOwner) updates.owner_id = bulkOwner;
    if (bulkTag) updates.tags = [bulkTag];
    
    const { error } = await supabase
      .from("crm_opportunities")
      .update(updates)
      .eq("company_id", companyId)  // ✅ Validar company
      .in("id", Array.from(selectedIds));
    
    if (error) throw error;
  },
  // ...
});
```

---

## 7️⃣ FIX CRÍTICO: Race Condition en Scoring

**Archivo:** `src/domain/crm/services/opportunityService.ts`

```typescript
// ANTES (❌ Race condition):
const applyScoringForOpportunity = async (opportunity: OpportunityDTO) => {
  const rules = await scoringRuleService.listActive(opportunity.companyId);
  const total = rules.length
    ? scoringRuleService.computeScore(opportunity, ...)
    : 0;

  if (opportunity.scoreTotal === total && opportunity.scoreUpdatedAt) {
    return opportunity;  // ⚠️ Check-then-act race condition
  }

  const now = new Date().toISOString();
  await opportunityRepository.updateSilently(opportunity.id, {
    score_total: total,
    score_updated_at: now,
  });
  return { ...opportunity, scoreTotal: total, scoreUpdatedAt: now };
};

// DESPUÉS (✅ Optimistic locking):
const applyScoringForOpportunity = async (opportunity: OpportunityDTO) => {
  const rules = await scoringRuleService.listActive(opportunity.companyId);
  const total = rules.length
    ? scoringRuleService.computeScore(opportunity, ...)
    : 0;

  // No hacer check - ir directo a update con comparación
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("crm_opportunities")
    .update({
      score_total: total,
      score_updated_at: now,
    })
    .eq("id", opportunity.id)
    .eq("updated_at", opportunity.updatedAt)  // ✅ Optimistic locking
    .select()
    .single();

  if (error) {
    if (error.message.includes("0 rows")) {
      // El record fue modificado, intentar de nuevo
      const refreshed = await opportunityRepository.getById(opportunity.id);
      return applyScoringForOpportunity(refreshed!);
    }
    throw error;
  }

  return data as OpportunityDTO;
};
```

---

## 8️⃣ FIX ALTO: Auditoría de Cambios - LOGGING EN TODAS LAS OPERACIONES

**Status:** ✅ **COMPLETADO** (14 de Marzo 2026)

### Cambios Realizados:

1. **opportunityService.ts** - ✅ Error logging agregado
   - [Ubicación](src/domain/crm/services/opportunityService.ts#L140-L168)
   - Ahora muestra errores de RLS/validación en browser console
   - Debug: `[ActivityLog] X/Y entries failed to insert: [errors]`

2. **bulkOperationService.ts** - ✅ Nuevo servicio creado
   - [Ubicación](src/domain/crm/services/bulkOperationService.ts)
   - `bulkUpdate()` - Actualizar múltiples + auto-logging
   - `bulkDelete()` - Eliminar múltiples + auto-logging

3. **OpportunitiesList.tsx** - ✅ Integración completada
   - [Ubicación](src/components/crm/OpportunitiesList.tsx#L38)
   - Import agregado: `bulkOperationService`
   - `bulkEditMutation` → usa `bulkOperationService.bulkUpdate()`
   - `bulkDeleteMutation` → usa `bulkOperationService.bulkDelete()`

### Problema Solucionado

El historial estaba vacío porque:
- ✅ **Edición individual** via OpportunityDrawer SÍ registra 
  - Ahora con error logging visible (`[ActivityLog]` en console)
- ✅ **Edición masiva** (bulk edit) en OpportunitiesList AHORA REGISTRA
  - Usa `bulkOperationService.bulkUpdate()`
- ✅ **Drag & drop** en OpportunitiesKanbanView
  - Ya usa `opportunityService.update()` → ya registra

---

### 🧪 Testing & Validation

**Step 1: Abre Browser Console**
```
DevTools (F12) → Console tab
```

**Step 2: Individual Edit**
```
Edita una oportunidad (cambiar stage, owner, tags):
✅ NO hay error = logs creados OK
❌ [ActivityLog] X/Y entries failed: ... = RLS issue (ver DEBUG abajo)
```

**Step 3: Bulk Edit**
```
Selecciona múltiples oportunidades → Cambiar stage
Toast: "Cambios aplicados y registrados"
✅ Abre Historial → debería ver nuevos logs
```

**Step 4: Bulk Delete**
```
Selecciona múltiples → Delete
Toast: "Oportunidades eliminadas y registradas"
✅ Antes de eliminar, revisa Historial → debería ver logs
```

---

### 🔴 Si Ves Error en Console

**Síntoma:** `[ActivityLog] 3/3 entries failed: Error: new row violates row-level security`

**Solución - En Supabase Dashboard > SQL Editor:**

```sql
-- 1. Verificar que existen las policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename = 'crm_activity_log';

-- 2. Si no hay 2 policies, crear:
CREATE POLICY "enable_insert_activity_logs"
  ON crm_activity_log
  FOR INSERT
  WITH CHECK (company_id = auth.jwt() -> 'company_id'::text);

CREATE POLICY "enable_select_activity_logs"
  ON crm_activity_log
  FOR SELECT
  USING (company_id = auth.jwt() -> 'company_id'::text);

-- 3. Verificar RLS está habilitado
ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;
```

**Luego:** Cierra el navegador y vuelve a probar.

---

### ✅ Verificación Post-Fix

Después de testing exitoso, el **Historial debería mostrar**:

```
[Sistema] Etapa: Nuevo → Propuesta | Responsable actualizado
[Sistema] Tags actualizados  
[Sistema] Etapa arrastrada de "Propuesta" a "Negociación"
```

Con timestamp de cuándo se hizo el cambio.

---

## 9️⃣ FIX ALTO: CORS Restrictivo

**Archivo:** `supabase/functions/send-crm-message/index.ts`

```typescript
// ANTES (❌):
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DESPUÉS (✅):
const getAllowedOrigins = () => {
  const env = Deno.env.get("ENVIRONMENT") || "production";
  
  const allowedByEnv: Record<string, string[]> = {
    production: [
      "https://app.tudominio.com",
      "https://app.otrodominio.com",
    ],
    staging: [
      "https://staging.tudominio.com",
      "http://localhost:3000",
    ],
    development: [
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  };
  
  return allowedByEnv[env] || [];
};

const getCorsHeaders = (origin: string) => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
};

serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ... rest ...
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Error al procesar solicitud" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 🔟 FIX ALTO: Error Handling Seguro

```typescript
// Archivo: src/components/crm/OpportunitiesKanbanView.tsx

// ANTES (❌ Silent fail):
const handleDrop = async (targetStage: string) => {
  try {
    await opportunityService.update(opp.id, { stage: targetStage });
    queryClient.invalidateQueries({ queryKey: ["crm-kanban-opps"] });
  } catch {
    // Silently fail
  }
};

// DESPUÉS (✅ Error handling):
const handleDrop = async (targetStage: string) => {
  try {
    // Validar stage pertenece al pipeline
    if (!selectedPipeline?.stages.includes(targetStage)) {
      toast.error("Etapa inválida");
      return;
    }

    const startTime = performance.now();
    await opportunityService.update(opp.id, { stage: targetStage });
    
    // Invalidate con pequeño delay
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["crm-kanban-opps"] });
    }, 100);
    
    const duration = performance.now() - startTime;
    if (duration > 1000) {
      console.warn("[Kanban] Slow update:", { oppId: opp.id, duration });
    }
    
    toast.success("Etapa actualizada");
  } catch (error) {
    console.error("[Kanban] Failed to move opportunity:", error);
    
    // Refetch para sincronizar UI
    await queryClient.invalidateQueries({ queryKey: ["crm-kanban-opps"] });
    
    const errorMsg = error instanceof Error ? error.message : "Error desconocido";
    toast.error(`No se pudo actualizar la etapa: ${errorMsg}`);
    
    // Reset drag state
    setDraggedOpp(null);
  }
};
```

---

## TESTING CHECKLIST

```bash
# 1. Test XSS
curl -X POST http://localhost:5173/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "log_id": "test-id",
    "channel": "email",
    "recipient": "test@example.com",
    "body": "<img src=x onerror=\"alert(xss)\">"
  }'
# Debería escapar el HTML

# 2. Test Rate Limiting
for i in {1..15}; do
  curl -X POST http://localhost/api/send-message ...
done
# Debería fallar en el 11º con 429

# 3. Test RLS
# Login as user1, intenta acceder a opp de user2
# Debería fallar

# 4. Test bulk delete
curl -X DELETE http://localhost/api/opps \
  -d '{ "ids": ["id_de_otra_company"] }'
# Debería fallar
```

---

*Tiempo estimado de implementación:*
- 🔴 Crítico: 16-20 horas
- 🟠 Alto: 12-16 horas
- **TOTAL: 28-36 horas = ~1 semana con 1 dev**

*Recommend: Paralelizar con 2 devs para completar en 3-4 días*
