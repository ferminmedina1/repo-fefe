# 🔐 AUDITORÍA DE SEGURIDAD E INTEGRIDAD - CRM & OPORTUNIDADES
## Análisis Profundo para Producción | Marzo 2026

**Preparado por:** QA Senior  
**Scope:** CRM Module (Oportunidades, Pipelines, Scoring, Mensajes)  
**Criticidad:** Alto - BLOQUEADORES ENCONTRADOS  
**Recomendación:** No pasar a producción sin resolver CRÍTICO & ALTO

---

## 📊 RESUMEN EJECUTIVO

| Nivel | Cantidad | Estado |
|-------|----------|--------|
| 🔴 **CRÍTICO** | 7 | **BLOQUEADOR** |
| 🟠 **ALTO** | 11 | **BLOQUEADOR** |
| 🟡 **MEDIO** | 9 | **IMPORTANTE** |
| 🟢 **BAJO** | 8 | **RECOMENDADO** |
| **TOTAL** | **35** | **issues encontrados** |

---

## 🔴 VULNERABILIDADES CRÍTICAS (BLOQUEADORES)

### 1. **XSS en Email HTML - send-crm-message**
**Severidad:** CRÍTICO | **Archivo:** `supabase/functions/send-crm-message/index.ts:44`

```typescript
// ❌ VULNERABLE
const html = `<p>${body}</p>`;  // Sin sanitización
```

**Problema:**
- El contenido del `body` se inserta directamente en HTML sin sanitizar
- Un usuario podría inyectar scripts maliciosos: `<img src=x onerror="alert('xss')">`
- Afecta a todos los emails CRM enviados

**Impacto:** 🔴 CRÍTICO
- Compromise de cuentas de usuarios que abren el email
- Robo de sesiones/tokens
- Defacement de contenido

**Fix Recomendado:**
```typescript
import DOMPurify from 'isomorphic-dompurify';  // O usar librería segura
const html = `<p>${DOMPurify.sanitize(body)}</p>`;
```

---

### 2. **Inyección SQL en Búsqueda - OpportunitiesKanbanView**
**Severidad:** CRÍTICO | **Archivo:** `src/components/crm/OpportunitiesKanbanView.tsx:93`

```typescript
// ❌ VULNERABLE
if (search) q = q.ilike("name", `%${search}%`);
```

**Problema:**
- La búsqueda `search` viene directamente del cliente sin validación
- Aunque Supabase usa prepared statements, falta validación de entrada
- Usuario malicioso podría enviar payloads extremadamente largos

**Impacto:** 🔴 CRÍTICO
- DoS (Denial of Service) con strings enormes
- Posible exfiltración de datos con timing attacks
- Performance degradation

**Fix Recomendado:**
```typescript
if (search) {
  const sanitized = search.trim().slice(0, 100);  // Limitar longitud
  if (sanitized) q = q.ilike("name", `%${sanitized}%`);
}
```

---

### 3. **Ausencia de Row Level Security (RLS) - OpportunitiesList**
**Severidad:** CRÍTICO | **Archivo:** `src/components/crm/OpportunitiesList.tsx:260-280`

```typescript
// ❌ NO HAY VALIDACIÓN DE COMPANY_ID EN MUTATION
const bulkDeleteMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase
      .from("crm_opportunities")
      .delete()
      .in("id", Array.from(selectedIds));  // ⚠️ Sin validar company_id
    if (error) throw error;
  },
  // ...
});
```

**Problema:**
- Un usuario de COMPANY_A podría eliminar opportunities de COMPANY_B si conoce los IDs
- No hay validación server-side de company_id en operaciones bulk
- Cliente puede modificar selectedIds fácilmente

**Impacto:** 🔴 CRÍTICO
- Violación de multi-tenancy
- Pérdida de datos de otros clientes
- Violación de GDPR/privacidad

**Fix Recomendado:**
```typescript
// En Supabase RLS Policy:
CREATE POLICY "Users can only access their company opportunities"
  ON crm_opportunities
  FOR ALL
  USING (company_id = auth.jwt() -> 'company_id');

// En servicio:
const bulkDeleteMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase
      .from("crm_opportunities")
      .delete()
      .eq("company_id", companyId)
      .in("id", Array.from(selectedIds));
  },
});
```

---

### 4. **Ejecución de Operaciones sin Validación Previa**
**Severidad:** CRÍTICO | **Archivo:** `src/components/crm/Pipelines.tsx:243`

```typescript
// ❌ FALTA VALIDACIÓN
const handleDrop = (stage: string) => {
  if (!draggedOpportunity || draggedOpportunity.stage === targetStage) {
    setDraggedOpp(null);
    return;
  }
  // Actualiza sin verificar si el stage existe en el pipeline
  try {
    await opportunityService.update(opp.id, { stage: targetStage });
    // ⚠️ Sin verificar que targetStage es válido para el pipeline
```

**Problema:**
- Un usuario podría mover una oportunidad a un stage inválido
- No valida que el stage pertenece al pipeline de la oportunidad
- No hay constraint en base de datos

**Impacto:** 🔴 CRÍTICO
- Corrupción de datos de pipeline
- Estados inconsistentes

**Fix Recomendado:**
```typescript
const handleDrop = async (targetStage: string) => {
  if (!draggedOpp) return;
  
  // Validar que el stage existe en el pipeline
  if (!selectedPipeline?.stages.includes(targetStage)) {
    toast.error("Etapa inválida");
    return;
  }
  
  await opportunityService.update(draggedOpp.id, { stage: targetStage });
};
```

---

### 5. **Almacenamiento Inseguro de Credenciales Twilio**
**Severidad:** CRÍTICO | **Archivo:** `supabase/functions/send-crm-message/index.ts:76-96`

```typescript
// ❌ CREDENCIALES EN BASE DE DATOS SIN ENCRIPCIÓN
const { data: creds } = await supabase
  .from("crm_whatsapp_credentials")
  .select("account_sid, auth_token, phone_number")
  .eq("company_id", companyId)
  .single();

const TWILIO_ACCOUNT_SID = creds?.account_sid;  // ⚠️ Plain text
const TWILIO_AUTH_TOKEN = creds?.auth_token;    // ⚠️ Plain text
```

**Problema:**
- Las credenciales Twilio se almacenan sin encriptar
- Si hay breach de base de datos, los tokens son comprometidos
- Acceso directo a Twilio API de atacantes

**Impacto:** 🔴 CRÍTICO
- Robo de credenciales Twilio
- Abuso de servicio, costos exponenciales
- Envío de mensajes maliciosos en nombre de la empresa

**Fix Recomendado:**
```typescript
// 1. Usar variables de entorno encriptadas (Supabase Vault)
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

// O 2. Usar encryption en Supabase:
// Instalar: pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

// Modificar tabla:
ALTER TABLE crm_whatsapp_credentials ADD COLUMN
  account_sid_encrypted text,
  auth_token_encrypted text;

// Guardar encriptado:
INSERT INTO crm_whatsapp_credentials (account_sid_encrypted, auth_token_encrypted)
VALUES (
  pgp_sym_encrypt('secret', 'key'),
  pgp_sym_encrypt('secret', 'key')
);

// Leer:
SELECT pgp_sym_decrypt(account_sid_encrypted::bytea, 'key') FROM crm_whatsapp_credentials;
```

---

### 6. **Inyección de Correos NO Validados - send-crm-message**
**Severidad:** CRÍTICO | **Archivo:** `supabase/functions/send-crm-message/index.ts:30`

```typescript
// ❌ SIN VALIDACIÓN
interface CRMMessageRequest {
  recipient: string;  // Acepta cualquier string
}

// Línea 48-50:
const response = await resend.emails.send({
  from: "Sistema Contable <onboarding@resend.dev>",
  to: [recipient],  // ⚠️ Sin verificar que es email válido
  subject: subject ?? "Notificación CRM",
  html,
});
```

**Problema:**
- No valida formato de email
- No valida que el recipient pertenece a la company
- Podría enviar emails a direcciones arbitrarias

**Impacto:** 🔴 CRÍTICO
- Phishing/abuse
- Spam masivo
- Revelación de información a direcciones no autorizadas

**Fix Recomendado:**
```typescript
import { z } from "zod";

const messageRequestSchema = z.object({
  log_id: z.string().uuid(),
  channel: z.literal("email").or(z.literal("whatsapp")),
  recipient: z.string().email("Email inválido"),
  subject: z.string().optional(),
  body: z.string().min(1).max(5000),
});

try {
  const payload = messageRequestSchema.parse(await req.json());
  // Validar que recipient pertenece a la opportunity/customer
  const { data: opportunity } = await supabase
    .from("crm_message_logs")
    .select("crm_opportunities(customers(email))")
    .eq("id", payload.log_id)
    .single();
  
  if (!opportunity?.email?.includes(payload.recipient)) {
    throw new Error("Recipient no autorizado");
  }
} catch {
  return new Response(JSON.stringify({ error: "Validación fallida" }), { status: 400 });
}
```

---

### 7. **Race Condition en Actualización de Scores - Pipelines**
**Severidad:** CRÍTICO | **Archivo:** `src/domain/crm/services/opportunityService.ts:79-86`

```typescript
// ❌ RACE CONDITION
const applyScoringForOpportunity = async (opportunity: OpportunityDTO) => {
  const rules = await scoringRuleService.listActive(opportunity.companyId);
  const total = rules.length
    ? scoringRuleService.computeScore(opportunity, ...)
    : 0;

  if (opportunity.scoreTotal === total && opportunity.scoreUpdatedAt) {
    return opportunity;  // ⚠️ Puede cambiar entre check y update
  }

  const now = new Date().toISOString();
  await opportunityRepository.updateSilently(opportunity.id, {
    score_total: total,
    score_updated_at: now,
  });
};
```

**Problema:**
- Entre leer `opportunity.scoreTotal` y actualizar, otro proceso podría cambiarla
- Dos actualizaciones simultáneas pueden causar pérdida d datos

**Impacto:** 🔴 CRÍTICO
- Scores inconsistentes
- Pérdida de actualizaciones

**Fix Recomendado:**
```typescript
// Usar transacción:
const applyScoringForOpportunity = async (opportunity: OpportunityDTO) => {
  const rules = await scoringRuleService.listActive(opportunity.companyId);
  const total = rules.length
    ? scoringRuleService.computeScore(opportunity, ...)
    : 0;

  const now = new Date().toISOString();
  
  // Update solo si no cambió (optimistic locking)
  const { error } = await supabase
    .from("crm_opportunities")
    .update({
      score_total: total,
      score_updated_at: now,
    })
    .eq("id", opportunity.id)
    .eq("updated_at", opportunity.updatedAt);  // ✅ Comparar timestamp

  if (error) {
    // Score cambió, reintentar
    return applyScoringForOpportunity(await opportunityRepository.getById(opportunity.id));
  }
};
```

---

## 🟠 VULNERABILIDADES ALTO (BLOQUEADORES)

### 8. **Falta de Rate Limiting en Edge Functions**
**Severidad:** ALTO | **Archivo:** `supabase/functions/send-crm-message/index.ts`

```typescript
// ❌ SIN RATE LIMITING
serve(async (req: Request) => {
  // Cualquiera puede llamar ilimitadamente
  if (channel === "email") {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send(...);
  }
});
```

**Problema:**
- Sin rate limiting, un usuario podría enviar 1000s de emails
- Costo exponencial en Resend/Twilio
- DoS attack posible

**Fix Recomendado:**
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),  // 10 por minuto
  analytics: true,
});

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const { success } = await ratelimit.limit(authHeader);  // Usar user ID
  
  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }
  // ...
});
```

---

### 9. **Silent Failures en Auditoría de Cambios - opportunityService.update()**
**Severidad:** ALTO | **Archivo:** [src/domain/crm/services/opportunityService.ts](src/domain/crm/services/opportunityService.ts#L140-L168) | **Status:** ✅ PARCIALMENTE IMPLEMENTADO

**Problema Original:**
Activity Log SÍ intenta crearse pero `Promise.allSettled()` silencia errores completamente (línea 140)

**Implementado (14 Marzo 2026):**
- ✅ Error logging agregado
- ✅ Ahora muestra en console: `[ActivityLog] X/Y entries failed to insert: [errors...]`
- ✅ bulkOperationService.ts creado para bulk edits

**Código Actualizado:**

```typescript
// Persist activity log entries (silently — don't break the update on log failure)
if (logEntries.length > 0) {
  const results = await Promise.allSettled(
    logEntries.map((entry) =>
      activityLogService.create({
        company_id: updated.companyId,
        opportunity_id: updated.id,
        action: entry.action,
        payload: entry.payload,
      })
    )
  );

  // Debug: Log any failures for debugging RLS/validation/DB issues
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(
      `[ActivityLog] ${failures.length}/${logEntries.length} entries failed to insert:`,
      failures.map((f) => (f as PromiseRejectedResult).reason)
    );
  }
}
```

**Pending:**
- 🟡 Bulk edit integration in OpportunitiesList.tsx (use bulkOperationService)
- 🟡 Verify RLS policies if console shows errors
- 🟡 Test activity log data flow end-to-end

**Fix:** Ver QUICK_FIX_GUIDE Sección 8 para debugging y integration steps



---

### 10. **Errores Revelando Información Sensitiva**
**Severidad:** ALTO | **Archivo:** `supabase/functions/send-crm-message/index.ts:155`

```typescript
// ❌ EXPONE DETALLES
} catch (error) {
  return new Response(
    JSON.stringify({ error: error?.message || "Error inesperado" }),  // ⚠️ Stack trace
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

**Problema:**
- Los detalles del error se envían al cliente
- Podrían revelar estructura interna, credenciales, etc.

**Fix Recomendado:**
```typescript
} catch (error) {
  console.error("[send-crm-message] Error:", error);  // Log privately
  return new Response(
    JSON.stringify({ error: "Error al procesar solicitud" }),  // Generic message
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

### 11. **Validación Insuficiente de Dates - OpportunitySchema**
**Severidad:** ALTO | **Archivo:** `src/domain/crm/validation/opportunitySchema.ts`

```typescript
// ❌ VALIDACIÓN DÉBIL
estimated_close_date: z.string().optional(),  // Solo string, sin formato
close_date: z.string().optional(),
```

**Problema:**
- Acepta cualquier string como fecha (ej: "invalid")
- Podría causar corrupción de datos en queries
- No valida que fecha futura sea realista

**Fix Recomendado:**
```typescript
estimated_close_date: z.string()
  .refine((val) => !val || !isNaN(Date.parse(val)), "Formato de fecha inválido")
  .refine((val) => !val || new Date(val) > new Date(), "Fecha debe ser en el futuro")
  .optional(),
close_date: z.string()
  .refine((val) => !val || !isNaN(Date.parse(val)), "Formato de fecha inválido")
  .optional(),
```

---

### 12. **Pérdida de Cambios en Forma - OpportunityDrawer**
**Severidad:** ALTO | **Archivo:** `src/components/crm/OpportunityDrawer.tsx:102-127`

```typescript
// ❌ FALTA MANEJO DE CAMBIOS NO GUARDADOS
const form = useForm<OpportunityForm>({
  resolver: zodResolver(opportunitySchema),
  defaultValues: {
    email: "",
    phone: "",
    // ...
  },
  mode: "onChange",
});

// Si usuario cierra el drawer sin guardar, se pierden cambios
export function OpportunityDrawer({ open, onClose, ... }: OpportunityDrawerProps) {
  // ⚠️ Sin prompt de confirmación
}
```

**Problema:**
- Usuario puede perder trabajo al cerrar accidentalmente
- No hay validación de cambios pendientes

**Fix Recomendado:**
```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

form.watch((data) => {
  const isDirty = JSON.stringify(data) !== JSON.stringify(form.formState.defaultValues);
  setHasUnsavedChanges(isDirty);
});

const handleClose = () => {
  if (hasUnsavedChanges) {
    if (!window.confirm("Tienes cambios sin guardar. ¿Descartar?")) {
      return;
    }
  }
  onClose();
};
```

---

### 13. **CORS Demasiado Permisivo - send-crm-message**
**Severidad:** ALTO | **Archivo:** `supabase/functions/send-crm-message/index.ts:7-9`

```typescript
// ❌ CORS ABIERTO
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ⚠️ Permite cualquier origen
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Problema:**
- Cualquier sitio puede llamar la edge function
- Phishing/hijacking posible

**Fix Recomendado:**
```typescript
const allowedOrigins = [
  "https://app.tudominio.com",
  Deno.env.get("ALLOWED_ORIGIN"),
];

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins.includes(req.headers.get("Origin") ?? "")
    ? req.headers.get("Origin") ?? ""
    : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

---

### 14. **Silent Failures en Operaciones Críticas**
**Severidad:** ALTO | **Archivo:** `src/components/crm/OpportunitiesKanbanView.tsx:123`

```typescript
// ❌ FALLA SILENCIOSA
const handleDrop = async (targetStage: string) => {
  // ...
  try {
    await opportunityService.update(opp.id, { stage: targetStage });
    queryClient.invalidateQueries({ queryKey: ["crm-kanban-opps"] });
  } catch {
    // silently fail — user can retry by dragging again  ⚠️ PROBLEMA
  }
};
```

**Problema:**
- El usuario no sabe si la operación falló
- Puede haber inconsistencias UI/backend
- Sin logs, imposible debuggear

**Fix Recomendado:**
```typescript
const handleDrop = async (targetStage: string) => {
  try {
    await opportunityService.update(opp.id, { stage: targetStage });
    queryClient.invalidateQueries({ queryKey: ["crm-kanban-opps"] });
    toast.success("Etapa actualizada");
  } catch (error) {
    console.error("[Kanban] Failed to move opportunity:", error);
    toast.error("No se pudo actualizar la etapa, intenta de nuevo");
    setDraggedOpp(null);
  }
};
```

---

### 15. **Almacenamiento en localStorage SIN Encriptación**
**Severidad:** ALTO | **Archivo:** `src/components/crm/OpportunitiesList.tsx:150-165`

```typescript
// ❌ INSEGURO
const STORAGE_KEY = `crm:opp:visibleColumns:${companyId}`;
const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_VISIBLE_KEYS;
  } catch {
    return DEFAULT_VISIBLE_KEYS;
  }
});

// Y también:
useEffect(() => {
  localStorage.setItem(`crm:oppSelection:${companyId}`, JSON.stringify(Array.from(selectedIds)));
}, [companyId, selectedIds]);
```

**Problema:**
- localStorage es vulnerable a XSS
- Si hay XSS, todo está comprometido
- IDs de opportunities están en texto plano

**Impacto:** ALTO
- Exposición de IDs internos

**Fix Recomendado:**
```typescript
// Usar sessionStorage + encryption para datos sensitivos:
import { encrypt, decrypt } from "@/utils/crypto";

const toggleColumn = useCallback((key: string) => {
  setVisibleColumnKeys((prev) => {
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    // Guardar SOLO preferencias de UI, no datos sensitivos
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });
}, [STORAGE_KEY]);

// NO guardar selectedIds en localStorage
const useSelectedOpportunities = () => {
  const [selectedIds, setSelectedIds] = useState(new Set<string>());  // Solo en memoria
  return { selectedIds, setSelectedIds };
};
```

---

### 16. **Inyección de Tags - OpportunitiesList**
**Severidad:** ALTO | **Archivo:** `src/components/crm/OpportunitiesList.tsx:290`

```typescript
// ❌ TAGS SIN VALIDACIÓN
if (bulkTag) updates.tags = [bulkTag];  // ⚠️ Aceptar cualquier string

// El tag viene de:
{tags.map((t: any) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
// ✓ OK - del servidor

// PERO el usuario podría modificar el valor del select en dev tools
```

**Problema:**
- Un atacante podría inyectar tags maliciosos via DevTools
- Sin validación server-side

**Fix Recomendado:**
```typescript
// Server-side validation:
const bulkEditMutation = useMutation({
  mutationFn: async () => {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    
    if (bulkStage) {
      // Validar que el stage es válido
      const validStages = pipelines
        .find(p => p.id === normalizedFilters.pipelineId)
        ?.stages ?? [];
      if (!validStages.includes(bulkStage)) {
        throw new Error("Etapa inválida");
      }
      updates.stage = bulkStage;
    }
    
    if (bulkTag) {
      // Validar que el tag existe
      const validTags = tags.map(t => t.name);
      if (!validTags.includes(bulkTag)) {
        throw new Error("Tag inválido");
      }
      updates.tags = [bulkTag];
    }
    
    const { error } = await supabase
      .from("crm_opportunities")
      .update(updates)
      .eq("company_id", companyId)  // ✅ Requerido
      .in("id", Array.from(selectedIds));
    if (error) throw error;
  },
  // ...
});
```

---

### 17. **Sin Validación de Límites Numéricos**
**Severidad:** ALTO | **Archivo:** `src/components/crm/OpportunityDrawer.tsx`

```typescript
// ❌ FALTA VALIDACIÓN
probability: z.number().min(0).max(100).optional(),  // ✓ OK
value: z.number().optional(),  // ⚠️ Sin límite máximo
expected_revenue: z.number().optional(),  // ⚠️ Sin límite
```

**Problema:**
- Usuario podría ingresar números extremadamente grandes
- Overflow en cálculos o almacenamiento
- Corrupción de reportes/estadísticas

**Fix Recomendado:**
```typescript
probability: z.number().min(0).max(100).optional(),
value: z.number().min(0).max(999999999).optional(),  // Máximo realista
expected_revenue: z.number().min(0).max(999999999).optional(),
```

---

### 18. **Falta de Validación de Propias Oportunidades**
**Severidad:** ALTO | **Archivo:** `src/components/crm/OpportunitiesList.tsx`

```typescript
// ❌ NO VALIDA PERTENENCIA
const deleteOpportunityMutation = useMutation({
  mutationFn: (id: string) => opportunityService.remove(id),
  // ⚠️ El servicio NO valida que la opp pertenece a la company
});
```

**Problema:**
- Un usuario podría eliminar opportunities de otra company
- Si conoce el ID, puede hacerlo

**Fix Recomendado:**
```typescript
// En servicio:
async remove(id: string, companyId: string) {
  const { error } = await supabase
    .from("crm_opportunities")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);  // ✅ Validar company
  
  if (error) throw error;
}

// En componente:
const deleteOpportunityMutation = useMutation({
  mutationFn: (id: string) => opportunityService.remove(id, companyId),
  // ...
});
```

---

## 🟡 VULNERABILIDADES MEDIO (IMPORTANTES)

### 19. **Falta de Verificación de Propiedad en Edit**
**Severidad:** MEDIO | Múltiples archivos

```typescript
// ⚠️ Patrón repetido sin validación de company_id
const { data: opportunity } = await opportunityRepository.getById(id);
// Sin verificar que opportunity.company_id === companyId
```

---

### 20. **Sin Paginación en RecalculateCompany**
**Severidad:** MEDIO | **Archivo:** `src/domain/crm/services/scoringRuleService.ts:61`

```typescript
// ⚠️ CARGA TODAS LAS OPPORTUNITIES
async recalculateCompany(companyId: string) {
  const [rules, opportunities] = await Promise.all([
    scoringRuleRepository.listActive(companyId),
    opportunityRepository.listForScoring(companyId),  // ✓ Sin límite
  ]);
```

**Riesgo:** Si hay 100k+ opportunities, timeout o memory leak

---

### 21. **Query Strings Expuestos en URL**
**Severidad:** MEDIO | Múltiples archivos

```typescript
// Los filtros están en la URL sin encripción
queryKey: ["opportunities", companyId, search ?? "", ...]
```

**Riesgo:** En logs/history, se ven búsquedas sensibles

---

### 22. **Sin Throttling de Queries**
**Severidad:** MEDIO | `OpportunitiesList.tsx`

```typescript
// Cada keystroke en búsqueda dispara query
onChange={(e) => setSearch(e.target.value)}  // Sin debounce
```

---

### 23. **Operaciones sin Transacción**
**Severidad:** MEDIO | `opportunityService.ts:79-86`

```typescript
// Multiple updates sin transacción, riesgo de inconsistencia
await opportunityRepository.update(id, values);
// ... después ...
await activityLogService.create(...);
// Si la segunda falla, la primera quedó sin log
```

---

### 24. **Sin Validación de Enum Values**
**Severidad:** MEDIO | `scoringRuleSchema.ts`

```typescript
field: values.field as any,  // ⚠️ Cast sin validación
operator: values.operator as any,
```

---

### 25. **Falta de Backup de Datos Críticos**
**Severidad:** MEDIO | Configuration

```typescript
// No hay evidencia de:
// - Backups automáticos
// - Point-in-time recovery
// - Data replication
```

---

### 26. **Sin Versionado de Cambios**
**Severidad:** MEDIO | `OpportunityDrawer.tsx`

```typescript
// No hay versiones de records para rollback
```

---

### 27. **Validación de Email Incompleta**
**Severidad:** MEDIO | `opportunitySchema.ts`

```typescript
email: z.string().min(1, "El email es requerido").email("Email inválido"),
// .email() no valida disposable emails, typos comunes
```

---

### 28. **Sin Límite de Inserciones Bulk**
**Severidad:** MEDIO | Múltiples servicios

```typescript
// Un usuario podría crear 1000 tags, rules, etc. sin límite
```

---

## 🟢 PROBLEMAS BAJO (RECOMENDADOS)

### 29-36. Otros Issues Menores
- No use `as any` casts sin necesidad
- Usar TypeScript strict mode
- Agregar logs estructurados (no console.log)
- Implement circuit breakers para APIs externas
- Memory leak potencial en subscriptions no canceladas
- Sin timeout en fetch operations
- GDPR: No hay endpoint de delete de datos
- Sin 2FA en admin CRM

---

## 📋 PLAN DE ACCIÓN - TIMELINE PARA PRODUCCIÓN

### FASE 1: CRÍTICO (3-5 DÍAS) - BLOQUEADOR
```
[ ] 1.1 Implementar XSS prevention (sanitización HTML)
[ ] 1.2 Agregar RLS policies en Supabase
[ ] 1.3 Encriptar credentials Twilio
[ ] 1.4 Validación de inputs en edge functions
[ ] 1.5 Implementar rate limiting
[ ] 1.6 Fix race conditions en scoring
```

### FASE 2: ALTO (1 SEMANA) - NO PASAR A PROD SIN ESTO
```
[ ] 2.1 Auditoría completa de cambios
[ ] 2.2 CORS policy restrictiva
[ ] 2.3 Proper error handling (sin leaks)
[ ] 2.4 Validación de fechas
[ ] 2.5 Unsaved changes warning
[ ] 2.6 Validación server-side de todos los IDs
```

### FASE 3: MEDIO (2 SEMANAS) - ANTES DE PRODUCCIÓN
```
[ ] 3.1 Transacciones en operaciones multi-step
[ ] 3.2 Proper enums en validación
[ ] 3.3 Throttling de queries
[ ] 3.4 Paginación en bulk operations
```

### FASE 4: BAJO (ITERATIVO) - POST PRODUCCIÓN
```
[ ] 4.1 Structured logging
[ ] 4.2 GDPR compliance
[ ] 4.3 2FA setup
[ ] 4.4 Circuit breakers
```

---

## 🔒 CHECKLIST PRE-PRODUCCIÓN

**SEGURIDAD:**
- [ ] ✅ Todas las credenciales en env vars/vault
- [ ] ✅ RLS policies activadas en Supabase
- [ ] ✅ Rate limiting en todos los endpoints
- [ ] ✅ XSS/CSRF protection implementada
- [ ] ✅ SQL injection mitigado
- [ ] ✅ CORS restringido

**INTEGRIDAD:**
- [ ] ✅ Validación server-side en cada endpoint
- [ ] ✅ Transacciones en operaciones multi-step
- [ ] ✅ Auditoría de cambios implementada
- [ ] ✅ Backups funcionando

**PERFORMANCE:**
- [ ] ✅ Queries optimizadas (índices)
- [ ] ✅ Caching implementado
- [ ] ✅ Paginación en listas
- [ ] ✅ Debouncing en búsquedas

**MONITOREO:**
- [ ] ✅ Error logging en todos los edge functions
- [ ] ✅ Performance monitoring
- [ ] ✅ Security monitoring (failed auth attempts)
- [ ] ✅ Cost monitoring (Resend, Twilio)

---

## 🎯 RECOMENDACIÓN FINAL

**STATUS:** 🔴 **NO APTO PARA PRODUCCIÓN**

**Razones:**
1. 7 vulnerabilidades CRÍTICAS encontradas
2. Falta de multi-tenancy enforcement
3. Credenciales almacenadas inseguramente
4. Sin auditoría de cambios
5. Silent failures sin notify al usuario

**Próximos Pasos:**
1. **Semana 1:** Resolver todos los CRÍTICO
2. **Semana 2:** Resolver todos los ALTO
3. **Semana 3:** QA final y UAT
4. **Semana 4:** Soft launch (5% usuarios)
5. **Semana 5:** Full production (con monitoreo 24/7)

**Stakeholders Requeridos:**
- Backend Lead: Revisar Supabase RLS
- Security: Auditoría de credenciales
- DevOps: Rate limiting, monitoring
- QA: Test cases para cada fixing
- Product: Comunicar delays si es necesario

---

*Anlizado con estándares: OWASP Top 10, CWE Top 25, PCI-DSS*  
*Reporte generado: Marzo 2, 2026*  
*Próxima revisión recomendada: Post-fixes (Marzo 15, 2026)*
