# Rate Limiting Implementation Guide

## Implementación de Rate Limiting en Edge Functions

### Estructura General

Cada edge function debe importar y usar los middlewares de rate limiting:

```typescript
import { checkRateLimitByUser, extractIP } from "../_shared/rateLimitMiddleware.ts";
import { errorResponse } from "../_shared/http.ts";

// En el manejador (después de autenticación)
const rateLimitCheck = await checkRateLimitByUser(
  userId,
  "nombre-del-endpoint", // o una RateLimitCategory
  categoryHint // opcional
);

if (!rateLimitCheck.allowed) {
  return errorResponse(rateLimitCheck.message, 429, {
    headers: rateLimitCheck.headers,
  });
}

// Agregar headers de rate limit a la respuesta
response.headers.set("X-RateLimit-Limit", rateLimitCheck.headers["X-RateLimit-Limit"]);
response.headers.set("X-RateLimit-Remaining", rateLimitCheck.headers["X-RateLimit-Remaining"]);
response.headers.set("X-RateLimit-Reset", rateLimitCheck.headers["X-RateLimit-Reset"]);
```

---

## Endpoints Críticos para Implementar

### 1. **AUTENTICACIÓN** (finalize-signup, check-signup-duplicates, consume-invite-token)

**Archivo:** `supabase/functions/finalize-signup/index.ts`

**Cambios requeridos:**
- Agregar rate limiting después de validación básica
- Usar categoría "auth"
- 5 requests por 15 minutos por usuario

**Snippet:**
```typescript
import { checkRateLimitByUser, extractIP } from "../_shared/rateLimitMiddleware.ts";

Deno.serve(async (req: Request) => {
  // ... validación básica ...
  
  // ✅ AGREGAR: Rate limiting
  const rateLimitCheck = await checkRateLimitByUser(
    userId, // del token JWT
    "finalize-signup",
    "auth"
  );

  if (!rateLimitCheck.allowed) {
    return errorResponse(
      rateLimitCheck.message || "Demasiados intentos de signup",
      429,
      { headers: rateLimitCheck.headers }
    );
  }
  
  // ... resto de la lógica ...
  
  // ✅ Agregar headers a la respuesta
  return jsonResponse({ ok: true, redirect_to: "/auth" }, 200, rateLimitCheck.headers);
});
```

**También implementar en:**
- `supabase/functions/check-signup-duplicates/index.ts`
- `supabase/functions/consume-invite-token/index.ts`

---

### 2. **PAGOS** (create-intent, start-checkout, save-stripe-payment-method, etc.)

**Archivos:**
- `supabase/functions/create-intent/index.ts`
- `supabase/functions/start-checkout/index.ts`
- `supabase/functions/save-stripe-payment-method/index.ts`
- `supabase/functions/delete-payment-method/index.ts`
- `supabase/functions/create-stripe-setup-intent/index.ts`
- `supabase/functions/create-mp-preapproval/index.ts`
- `supabase/functions/mp-create-token/index.ts`
- `supabase/functions/signup-save-payment-method/index.ts`

**Snippet:**
```typescript
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

Deno.serve(async (req: Request) => {
  // ... validación ...
  
  // ✅ AGREGAR: Rate limiting
  const rateLimitCheck = await checkRateLimitByUser(
    userId,
    "create-intent",
    "payment"
  );

  if (!rateLimitCheck.allowed) {
    return errorResponse(
      rateLimitCheck.message || "Demasiados intentos de pago",
      429,
      { headers: rateLimitCheck.headers }
    );
  }

  // ... resto ...
});
```

---

### 3. **FINANZAS** (afip-facturar, charge-trial-subscriptions, afip-auth)

**Archivos:**
- `supabase/functions/afip-facturar/index.ts`
- `supabase/functions/charge-trial-subscriptions/index.ts`
- `supabase/functions/afip-auth/index.ts`

**Nivel de criticidad:** MÁS ALTO - Estos generan facturas reales y cargos

**Snippet:**
```typescript
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

Deno.serve(async (req: Request) => {
  // ... validación ...
  
  // ✅ AGREGAR: Rate limiting MUY ESTRICTO
  const rateLimitCheck = await checkRateLimitByUser(
    userId,
    "afip-facturar",
    "financial"
  );

  if (!rateLimitCheck.allowed) {
    return errorResponse(
      rateLimitCheck.message || "Límite de facturas por minuto alcanzado",
      429,
      { headers: rateLimitCheck.headers }
    );
  }

  // ... resto ...
});
```

**Límites especiales:** Ver `rateLimitConfig.ts` SPECIAL_RATE_LIMITS

---

### 4. **ADMIN** (delete-account, reset-database, save-smtp-config)

**Archivos:**
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/reset-database/index.ts`
- `supabase/functions/save-smtp-config/index.ts`
- `supabase/functions/update-platform-support-ticket-status/index.ts`

**Nivel de criticidad:** MÁXIMO - Operaciones destructivas o sensibles

**Snippet:**
```typescript
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

Deno.serve(async (req: Request) => {
  // ... validación ...
  
  // ✅ AGREGAR: Rate limiting EXTREMADAMENTE ESTRICTO
  const rateLimitCheck = await checkRateLimitByUser(
    userId,
    "delete-account",
    "admin"
  );

  if (!rateLimitCheck.allowed) {
    return errorResponse(
      rateLimitCheck.message || "No puedes repetir esta operación ahora",
      429,
      { headers: rateLimitCheck.headers }
    );
  }

  // ... resto ...
});
```

---

### 5. **NOTIFICACIONES** (send-bulk-email, send-crm-notification, etc.)

**Archivos:**
- `supabase/functions/send-bulk-email/index.ts`
- `supabase/functions/send-crm-notification/index.ts`
- `supabase/functions/send-alert-email/index.ts`
- `supabase/functions/send-customer-support-notification/index.ts`

**Nota:** `send-crm-message` ya tiene rate limiting via Upstash

**Snippet:**
```typescript
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

Deno.serve(async (req: Request) => {
  // ... validación ...
  
  // ✅ AGREGAR: Rate limiting normal
  const rateLimitCheck = await checkRateLimitByUser(
    userId,
    "send-bulk-email",
    "notifications"
  );

  if (!rateLimitCheck.allowed) {
    return errorResponse(
      rateLimitCheck.message || "Límite de notificaciones alcanzado",
      429,
      { headers: rateLimitCheck.headers }
    );
  }

  // ... resto ...
});
```

---

### 6. **BULK OPERATIONS** (bulk import)

**Archivos:**
- `supabase/functions/api-v1/index.ts` (rutas POST /bulk/import/:resource)

**Snippet:**
```typescript
// En la ruta de bulk import
const rateLimitCheck = await checkRateLimitByUser(
  userId,
  "bulk-import",
  "bulk"
);

if (!rateLimitCheck.allowed) {
  return errorResponse(
    rateLimitCheck.message || "Límite de importaciones alcanzado",
    429,
    { headers: rateLimitCheck.headers }
  );
}
```

---

### 7. **INTEGRACIONES** (integrations-get-credentials, integrations-save-credentials)

**Archivos:**
- `supabase/functions/integrations-get-credentials/index.ts`
- `supabase/functions/integrations-save-credentials/index.ts`
- `supabase/functions/integrations-ml-start/index.ts`

**Snippet:**
```typescript
const rateLimitCheck = await checkRateLimitByUser(
  userId,
  "integrations-save-credentials",
  "integrations"
);

if (!rateLimitCheck.allowed) {
  return errorResponse(
    rateLimitCheck.message || "Límite de integraciones alcanzado",
    429,
    { headers: rateLimitCheck.headers }
  );
}
```

---

### 8. **WEBHOOKS** (mercadopago-webhook, webhooks-google-forms)

**Nota:** Los webhooks públicos pueden ser limitados por IP en lugar de userId

**Archivos:**
- `supabase/functions/mercadopago-webhook/index.ts`
- `supabase/functions/webhooks-google-forms/index.ts`

**Snippet (usando IP):**
```typescript
import { checkRateLimitByIP, extractIP } from "../_shared/rateLimitMiddleware.ts";

Deno.serve(async (req: Request) => {
  const ip = extractIP(req);
  
  // ✅ AGREGAR: Rate limiting por IP para webhooks públicos
  const rateLimitCheck = await checkRateLimitByIP(
    ip,
    "mercadopago-webhook",
    "webhooks"
  );

  if (!rateLimitCheck.allowed) {
    return errorResponse(
      "Webhook rate limit exceeded",
      429,
      { headers: rateLimitCheck.headers }
    );
  }

  // ... resto ...
});
```

---

## Implementación Paso a Paso

1. **Copiar archivos compartidos:**
   - `rateLimitConfig.ts` ✅ Ya creado
   - `rateLimitMiddleware.ts` ✅ Ya creado

2. **Actualizar cada edge function:**
   - [ ] finalize-signup
   - [ ] check-signup-duplicates
   - [ ] consume-invite-token
   - [ ] create-intent
   - [ ] start-checkout
   - [ ] save-stripe-payment-method
   - [ ] delete-payment-method
   - [ ] create-stripe-setup-intent
   - [ ] create-mp-preapproval
   - [ ] mp-create-token
   - [ ] signup-save-payment-method
   - [ ] afip-facturar
   - [ ] charge-trial-subscriptions
   - [ ] afip-auth
   - [ ] delete-account
   - [ ] reset-database
   - [ ] save-smtp-config
   - [ ] update-platform-support-ticket-status
   - [ ] send-bulk-email
   - [ ] send-crm-notification
   - [ ] send-alert-email
   - [ ] send-customer-support-notification
   - [ ] integrations-get-credentials
   - [ ] integrations-save-credentials
   - [ ] integrations-ml-start
   - [ ] mercadopago-webhook
   - [ ] webhooks-google-forms
   - [ ] api-v1 (bulk operations)

3. **Testing:**
   - Verificar que los headers X-RateLimit-* se retornan
   - Simular ataques y verificar que se bloquean
   - Verificar fallback en-memoria si Redis no está disponible

---

## Envariables Requeridas

```bash
# .env.local (Supabase)
UPSTASH_REDIS_URL=https://[token]@[region].upstash.io
```

Si UPSTASH_REDIS_URL no está definido, el sistema fallback a cache en-memoria.

---

## Respuestas de Rate Limit

Cuando se excede el límite, la respuesta es:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712000000

{
  "error": "Demasiados intentos. Intenta nuevamente en 15 minutos.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Logs de Auditoría

Considera agregar logging cuando se excede rate limit:

```typescript
if (!rateLimitCheck.allowed) {
  console.warn(`[RATE_LIMIT] User ${userId} exceeded limit for ${endpoint}`, {
    remaining: rateLimitCheck.remaining,
    resetAt: new Date(rateLimitCheck.resetAt),
  });
  return errorResponse(...);
}
```

---

## Excepciones

Algunos endpoints pueden necesitar excepciones (ej: modo desarrollo):

```typescript
// Para un usuario específico (testing)
if (userId === Deno.env.get("TESTING_USER_ID")) {
  // Skip rate limiting
} else {
  const rateLimitCheck = await checkRateLimitByUser(...);
  // ... verificar ...
}
```

---

**Última actualización:** April 7, 2026  
**Framework:** Supabase Edge Functions (Deno)  
**Backend:** Upstash Redis + In-memory fallback
