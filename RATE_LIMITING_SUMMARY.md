# Rate Limiting Implementation Summary

## ✅ Lo que se ha hecho (Fase 1)

### Archivos Creados:

1. **rateLimitConfig.ts** (`supabase/functions/_shared/rateLimitConfig.ts`)
   - Configuración centralizada de rate limiting
   - Categorías: auth, payment, financial, admin, mutations, bulk, notifications, exports, integrations, webhooks
   - Límites específicos por categoría
   - Mapeo de endpoints a categorías
   - Límites especiales para operaciones críticas

2. **rateLimitMiddleware.ts** (`supabase/functions/_shared/rateLimitMiddleware.ts`)
   - Middleware de rate limiting distribuido
   - Soporte para Upstash Redis
   - Fallback a cache en-memoria
   - Funciones: `checkRateLimitByUser()`, `checkRateLimitByIP()`, `extractIP()`

3. **rateLimitUtils.ts** (`supabase/functions/_shared/rateLimitUtils.ts`)
   - Utilidades helper para implementación simplificada
   - Funciones: `applyRateLimit()`, `applyRateLimitUser()`, `applyRateLimitIP()`

4. **RATE_LIMITING_IMPLEMENTATION_GUIDE.md**
   - Guía paso a paso para implementar en cada endpoint
   - Ejemplos de código
   - Patrones de uso
   - Lista de endpoints críticos

5. **RATE_LIMITING_STATUS.md**
   - Estado de implementación
   - Endpoints por implementar con prioridades
   - Testing guide
   - Estimaciones

### Edge Functions Actualizados:

1. **finalize-signup** ✅
   - Rate limit: 5 requests/15 minutos por IP
   - Categoría: auth
   - Protección: contra spam de signups

2. **create-intent** ✅
   - Rate limit: 5 requests/minuto por IP (custom)
   - Categoría: payment
   - Protección: contra creación abusiva de intents de pago

---

## 🔄 Próximos Pasos (Fase 2)

### Endpoints Críticos a Actualizar:

**Autenticación (3):**
```
- check-signup-duplicates
- consume-invite-token
```

**Pagos (8):**
```
- start-checkout
- save-stripe-payment-method
- delete-payment-method
- create-stripe-setup-intent
- create-mp-preapproval
- mp-create-token
- signup-save-payment-method
- get-intent-status
- mark-intent-ready
```

**Finanzas (3):**
```
- afip-facturar (SPECIAL: 5/min)
- charge-trial-subscriptions (SPECIAL: 2/min)
- afip-auth
```

**Admin (4):**
```
- delete-account (SPECIAL: 1/hora)
- reset-database (SPECIAL: 1/hora)
- save-smtp-config
- update-platform-support-ticket-status
```

### Pattern a Aplicar:

**Para endpoints públicos (sin autenticación):**
```typescript
import { checkRateLimitByIP, extractIP } from "../_shared/rateLimitMiddleware.ts";

Deno.serve(async (req: Request) => {
  // Validación básica
  if (req.method !== "POST") {
    return json({ error: "Only POST allowed" }, 405);
  }

  // 🔒 Rate limiting
  const ip = extractIP(req);
  const rateLimitCheck = await checkRateLimitByIP(
    ip,
    "endpoint-name",
    "categoría"
  );
  
  if (!rateLimitCheck.allowed) {
    const response = new Response(
      JSON.stringify({
        error: rateLimitCheck.message,
        code: "RATE_LIMIT_EXCEEDED",
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // ... resto de lógica ...
});
```

**Para endpoints autenticados:**
```typescript
import { checkRateLimitByUser } from "../_shared/rateLimitMiddleware.ts";

// Después de validar JWT
const { userId } = await requireAuth(req);
const rateLimitCheck = await checkRateLimitByUser(
  userId,
  "endpoint-name",
  "categoría"
);

if (!rateLimitCheck.allowed) {
  return errorResponse(rateLimitCheck.message, 429, {
    headers: rateLimitCheck.headers
  });
}
```

---

## 📊 Estado General

| Métrica | Valor |
|---------|-------|
| Endpoints totales | ~45 |
| Implementados | 2 (4%) |
| Por implementar | 43 (96%) |
| Críticos | 15 |
| Medianos | 20 |
| Archivos compartidos creados | 3 |
| Documentación| 2 |

---

## 🚀 Instalación de Dependencias

### Upstash Redis (Distribuido - Recomendado)

1. Crear cuenta en [https://upstash.com](https://upstash.com)
2. Crear una base de datos Redis
3. Copiar URL a `.env.local`:
   ```bash
   UPSTASH_REDIS_URL=https://[user]:[password]@[region].upstash.io
   ```

Si **no** se configura Upstash Redis:
- El sistema fallback a cache en-memoria
- Funciona solo si hay una instancia de edge function (para desarrollo)
- En producción con múltiples instancias, usar Redis es RECOMENDADO

---

## ✅ Testing

```bash
# Testear finalize-signup
for i in {1..10}; do
  curl -X POST http://localhost:54321/functions/v1/finalize-signup \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 192.168.1.1" \
    -d '{"intent_id":"test","password":"test"}' \
    -w "\n[%{http_code}] Remaining:%{header_x-ratelimit-remaining}\n"
  sleep 0.5
done

# Testear create-intent
for i in {1..12}; do
  curl -X POST http://localhost:54321/functions/v1/create-intent \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "plan_id": "test",
      "provider": "stripe"
    }' \
    -w "\n[%{http_code}] Remaining:%{header_x-ratelimit-remaining}\n"
  sleep 0.5
done
```

---

## 📝 Configuración de Headers

Las respuestas incluyen headers estándar de rate limiting:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712500000
```

---

## 🔐 Security Considerations

1. **IP Extraction:** Maneja X-Forwarded-For, X-Real-IP para detectar IP real detrás de proxies
2. **Fallback Seguro:** Si Redis falla, usa cache en-memoria (no rechaza solicitudes)
3. **Logging:** Recomienda loguear intentos excedidos en audit logs
4. **TTL:** Se limpian automáticamente las entradas expiradas

---

## 🐛 Troubleshooting

**_Problema:_ Todos los requests retornan 429**
- Verificar que `UPSTASH_REDIS_URL` e válida
- En desarrollo, verificar que no hay una instancia de Upstash actual

**_Problema:_ Headers X-RateLimit-* no aparecen**
- Verificar que la respuesta retorna los headers del objeto `rateLimitCheck.headers`
- Algunos proxies pueden filtrar headers customizados

**_Problema:_ Rate limiting no funciona distribuido**
- Verificar env var `UPSTASH_REDIS_URL` en todas las instancias
- Revisar credenciales de Upstash

---

## 📖 Recursos

- [Upstash Redis Documentation](https://upstash.com/docs)
- [RFC 6585: 429 Too Many Requests](https://tools.ietf.org/html/rfc6585)
- [Rate Limiting Best Practices](https://en.wikipedia.org/wiki/Rate_limiting)
- [OWASP: Brute Force Attack](https://owasp.org/www-community/attacks/Brute_force_attack)

---

## 📞 Soporte

- Revisar `RATE_LIMITING_IMPLEMENTATION_GUIDE.md` para patrones específicos
- Revisar `RATE_LIMITING_STATUS.md` para lista de endpoints
- Revisar `rateLimitConfig.ts` para límites personalizados

---

**Última actualización:** April 7, 2026  
**Framework:** Supabase Edge Functions (Deno)  
**Backend:** Upstash Redis + In-memory fallback  
**Status:** Fase 1 completada ✅ | Fase 2 requerida
