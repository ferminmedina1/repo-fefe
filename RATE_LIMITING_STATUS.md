# Rate Limiting Implementation Status

## Endpoints Implementados ✅

- [x] `finalize-signup` — Rate limiting por IP, categoría "auth"

## Endpoints por Implementar (Prioridad)

### 🔴 CRÍTICA (Seguridad/Fraude)

**Autenticación:**
- [ ] `check-signup-duplicates` — Rate limit: 30/min
- [ ] `consume-invite-token` — Rate limit: 10/min

**Pagos (Prevención de fraude):**
- [ ] `create-intent` — Rate limit: 5/min
- [ ] `start-checkout` — Rate limit: 10/min
- [ ] `save-stripe-payment-method` — Rate limit: 10/min
- [ ] `delete-payment-method` — Rate limit: 10/min
- [ ] `create-stripe-setup-intent` — Rate limit: 10/min
- [ ] `create-mp-preapproval` — Rate limit: 10/min
- [ ] `mp-create-token` — Rate limit: 10/min
- [ ] `signup-save-payment-method` — Rate limit: 10/min
- [ ] `get-intent-status` — Rate limit: 30/min
- [ ] `mark-intent-ready` — Rate limit: 10/min

**Finanzas (Transacciones reales):**
- [ ] `afip-facturar` — Rate limit: 5/min (Special)
- [ ] `afip-auth` — Rate limit: 5/min
- [ ] `charge-trial-subscriptions` — Rate limit: 2/min (Special)

### 🟡 ALTA (Admin/Destructivo)

- [ ] `delete-account` — Rate limit: 1/hour (Special)
- [ ] `reset-database` — Rate limit: 1/hour (Special)
- [ ] `save-smtp-config` — Rate limit: 10/hour
- [ ] `update-platform-support-ticket-status` — Rate limit: 30/min

### 🟠 MEDIA (Datos)

**Bulk/Import:**
- [ ] `api-v1` (POST /bulk/import/:resource) — Rate limit: 10/min

**Notificaciones:**
- [ ] `send-bulk-email` — Rate limit: 5/min
- [ ] `send-crm-notification` — Rate limit: 30/min
- [ ] `send-alert-email` — Rate limit: 30/min
- [ ] `send-customer-support-notification` — Rate limit: 30/min
- [ ] `send-crm-report-webhook` — Rate limit: 20/min
- [ ] `send-monthly-reports` — Rate limit: 5/min
- [ ] ✅ `send-crm-message` — YA TIENE (10/min via Upstash)

**Integraciones:**
- [ ] `integrations-get-credentials` — Rate limit: 20/min
- [ ] `integrations-save-credentials` — Rate limit: 20/min
- [ ] `integrations-ml-start` — Rate limit: 10/min
- [ ] `integrations-ml-callback` — Rate limit: 30/min (webhook)

**Webhooks/Externos:**
- [ ] `mercadopago-webhook` — Rate limit: 50/min (por IP)
- [ ] `webhooks-google-forms` — Rate limit: 50/min (por IP)

---

## Patrón de Implementación

### Para endpoints autenticados (con userId):

```typescript
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

// Después de validar el JWT
const userId = /* extraer del token */;
const rateLimitCheck = await checkRateLimitByUser(
  userId,
  "nombre-endpoint",
  "categoría"
);

if (!rateLimitCheck.allowed) {
  return errorResponse(
    rateLimitCheck.message,
    429,
    { headers: rateLimitCheck.headers }
  );
}

// Agregar headers a respuesta exitosa
return jsonResponse({ ...data }, 200, rateLimitCheck.headers);
```

### Para endpoints públicos/webhooks (sin userId):

```typescript
import { checkRateLimitByIP, extractIP } from "../_shared/rateLimitMiddleware.ts";

const ip = extractIP(req);
const rateLimitCheck = await checkRateLimitByIP(
  ip,
  "nombre-endpoint",
  "categoría"
);

if (!rateLimitCheck.allowed) {
  return errorResponse(
    rateLimitCheck.message,
    429,
    { headers: rateLimitCheck.headers }
  );
}
```

---

## Notas Técnicas

- **Almacenamiento:** Upstash Redis (distribuido) + fallback en-memoria
- **Headers HTTP:** X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- **Status code:** 429 Too Many Requests
- **JSON response:** `{ error: "mensaje", code: "RATE_LIMIT_EXCEEDED" }`

---

## Testing

```bash
# Test finalize-signup rate limiting (5 solicitudes en 15 minutos)
for i in {1..10}; do
  curl -X POST http://localhost:54321/functions/v1/finalize-signup \
    -H "Content-Type: application/json" \
    -d '{"intent_id":"test","password":"test"}' \
    -w "\n[%{http_code}] X-RateLimit-Remaining:%{header_x-ratelimit-remaining}\n"
  sleep 1
done

# Deberías ver:
# - Primeras 5 solicitudes: 200/429 (varía según lógica)
# - Solicitudes 6-10: 429 Too Many Requests
# - X-RateLimit-Remaining: decreciendo de 4 a 0
```

---

**Estadísticas:**
- Total endpoints: ~45
- Implementados: 1 (2%)
- Por implementar: 44 (98%)
- Críticos: 15
- Prioridad alta: 4
- Prioridad media: 25

**Estimación:** 2-3 horas (actualizar todas las funciones)

**Última actualización:** April 7, 2026
