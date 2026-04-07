# 🔒 Guía de Seguridad - Sistema Integral

## Resumen de Implementaciones de Seguridad

Se ha implementado un sistema completo de seguridad en toda la aplicación para proteger contra ataques comunes y exposure de datos sensibles.

---

## 📋 Checklist de Seguridad

### ✅ Implementado

1. **Protección de API Keys y Secretos**
   - ✓ Uso de variables de ambiente (`.env.local`)
   - ✓ Nunca exponiendo keys en código frontend
   - ✓ Supabase usando ANON_KEY (pública) correctamente
   - ✓ Secrets backend en variables de ambiente del servidor

2. **Validación de Inputs**
   - ✓ Validadores tipados en `/src/lib/validators.ts`
   - ✓ Validación de emails, strings, números, UUIDs
   - ✓ Patrones regex seguros para prevenir XSS
   - ✓ Límites de longitud configurable
   - ✓ Sanitización en SendNotificationModule

3. **Rate Limiting**
   - ✓ Sistema de rate limiting por cliente en `/src/lib/rateLimiter.ts`
   - ✓ Presets configurados:
     - Login: 5 intentos/15 min (previene fuerza bruta)
     - Notificaciones: 10/min
     - Admin: 100/min
     - API General: 100/min
   - ✓ Feedback visual en UI al exceder límite
   - ✓ Logging de alertas de seguridad

4. **Detección de Anomalías**
   - ✓ Sistema de alertas de seguridad
   - ✓ Logging de rata-limit violations
   - ✓ Auditoría de acciones sensibles

---

## 🚫 Errores de Seguridad Comunes (Prevenidos)

### 1. **Exposición de API Keys**
```typescript
// ❌ MAL
const apiKey = "sk_live_1234567890"; // NO HAGAS ESTO

// ✅ BIEN
const apiKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY; // Solo en build
```

**Cómo verificar**: 
- Never commit `.env.local` o archivos con secrets
- Usar `.env.example` con placeholders
- En GitHub Actions, usar secrets workflow

### 2. **XSS (Cross-Site Scripting)**
```typescript
// ❌ MAL
<div>{userInput}</div> // Si userInput tiene <script>, se ejecuta

// ✅ BIEN (React lo hace automático, pero valida igualmente)
const validated = validateString(userInput);
return <div>{validated.value}</div>;
```

**Validación**: Patrones regex que rechazan caracteres peligrosos

### 3. **Inyección SQL**
```typescript
// ❌ MAL - No posible con Supabase
query(`SELECT * FROM users WHERE id = '${userId}'`);

// ✅ BIEN (Supabase usa prepared statements)
await supabase
  .from("users")
  .select()
  .eq("id", userId); // userId es parametrizado automáticamente
```

### 4. **Fuerza Bruta en Login**
```typescript
// ❌ MAL - Sin rate limiting
for (let i = 0; i < 1000; i++) {
  await login(email, generatePassword());
}

// ✅ BIEN - Rate limited a 5 intentos/15 min
const limiter = useRateLimitWithPreset("login", "login");
const { allowed } = limiter.check();
if (!allowed) throw new Error("Demasiados intentos");
```

---

## 📚 Archivos de Seguridad Creados

### 1. `/src/lib/validators.ts`
Validadores reutilizables para toda la app:

```typescript
import { validateNotificationTitle, validateEmail, validateNumber } from "@/lib/validators";

// Usar en el componente
const titleValidation = validateNotificationTitle(userInput);
if (!titleValidation.valid) {
  console.error(titleValidation.error); // "Máximo 100 caracteres"
}
```

**Disponibles:**
- `validateString()` - Cadenas genéricas
- `validateEmail()` - Emails
- `validateNumber()` - Números
- `validateUUID()` - IDs
- `validateNotificationTitle()` - Títulos
- `validateNotificationMessage()` - Mensajes
- `validateNotificationInput()` - Objeto completo

### 2. `/src/lib/rateLimiter.ts`
Rate limiting client-side:

```typescript
import { useRateLimitWithPreset } from "@/lib/rateLimiter";

function MyComponent() {
  const limiter = useRateLimitWithPreset("send-notification", "sendNotification");
  
  const handleSubmit = () => {
    const { allowed, remainingRequests, resetTime } = limiter.check();
    
    if (!allowed) {
      toast.error(`Espera ${formatResetTime(resetTime)}`);
      return;
    }
    
    // Proceder con envío
  };
}
```

**Presets:**
- `"admin"` - 100/min
- `"sendNotification"` - 10/min  
- `"read"` - 1000/min
- `"write"` - 100/min
- `"login"` - 5/15min
- `"api"` - 100/min
- `"search"` - 500/min

### 3. `/src/lib/security.config.ts`
Configuración de seguridad global:

```typescript
import { 
  SECURITY_CHECKLIST,
  createSecurityAlert, 
  sendSecurityAlert 
} from "@/lib/security.config";

// Loguear evento sensible
sendSecurityAlert(
  createSecurityAlert(
    "rate_limit_exceeded",
    "high",
    "Alguien intentó enviar notificaciones spam"
  )
);
```

---

## 🔐 Mejores Prácticas Implementadas

### En SendNotificationModule.tsx

```typescript
// 1. Validar inputs
const titleValidation = validateNotificationTitle(title);
const messageValidation = validateNotificationMessage(message);

// 2. Verificar rate limit
const { allowed, remainingRequests } = rateLimiter.check();
if (!allowed) {
  sendSecurityAlert(createSecurityAlert("rate_limit_exceeded", "high", ...));
  throw new Error("Rate limit exceeded");
}

// 3. Sanitizar antes de guardar
const notifications = targetCompanies.map(company_id => ({
  company_id,
  title: title.trim(), // Elimina espacios en blanco
  message: message.trim(),
  // ... otros campos
}));
```

---

## 📝 Validación de Inputs - Guía Práctica

### Validar Notificación Completa
```typescript
import { validateNotificationInput } from "@/lib/validators";

const result = validateNotificationInput({
  title: userTitle,
  message: userMessage,
  notification_type: selectedType,
  severity: selectedSeverity,
  company_id: companyId
});

if (!result.valid) {
  // result.errors contiene errores detallados
  console.error(result.errors);
  return;
}

// result.data es seguro de usar
const safeData = result.data;
```

### Validar String Genérico
```typescript
const validation = validateString(input, {
  min: 1,
  max: 500,
  pattern: /^[a-zA-Z0-9\s]+$/, // Solo alfanuméricos y espacios
  required: true
});

if (!validation.valid) {
  setError(validation.error);
} else {
  setCleanValue(validation.value); // Trimmed
}
```

---

## 🚨 Rate Limiting - Ejemplos

### Prevenir Spam en Notificaciones
```typescript
// Máximo 10 notificaciones por minuto
const limiter = useRateLimitWithPreset("notify-admin", "sendNotification");

const { allowed, remainingRequests, resetTime } = limiter.check();
if (!allowed) {
  return toast.error(`Intenta en ${formatResetTime(resetTime)}`);
}
```

### Prevenir Fuerza Bruta en Login
```typescript
// Máximo 5 intentos en 15 minutos
const limiter = useRateLimitWithPreset("login-attempt", "login");

if (!limiter.check().allowed) {
  return toast.error("Demasiados intentos. Intenta en 15 minutos");
}
```

---

## 🔗 Integración en Nuevas Operaciones

### Paso 1: Importar validadores
```typescript
import { validateString, validateEmail } from "@/lib/validators";
import { useRateLimitWithPreset } from "@/lib/rateLimiter";
```

### Paso 2: Usar en componente
```typescript
function MyComponent() {
  const [value, setValue] = useState("");
  const limiter = useRateLimitWithPreset("my-operation", "write");
  
  const handleSubmit = () => {
    // Validar
    const validation = validateString(value, { required: true });
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    // Rate limit
    if (!limiter.check().allowed) {
      setError("Demasiadas operaciones");
      return;
    }
    
    // Proceder
    submitData(validation.value);
  };
}
```

---

## 📊 Auditoría y Logging

Todas las operaciones sensibles se loguean:

```typescript
import { logAuditEvent } from "@/lib/security.config";

logAuditEvent({
  action: "send_notification",
  userId: user.id,
  status: "success",
  details: {
    recipientCount: 42,
    notificationType: "payment_overdue"
  }
});
```

Estos logs se pueden:
- Enviar a Sentry para monitoreo
- Integrar con sistemas de auditoría
- Usar para análisis de uso

---

## 🛡️ Checklist para Nuevas Features

AL agregar una nueva feature con inputs de usuario:

- [ ] Importar validadores apropiados
- [ ] Validar inputs antes de usar
- [ ] Agregar rate limiting si es operación sensible
- [ ] Loguear acciones de seguridad
- [ ] Sanitizar datos antes de guardar
- [ ] No exponer errores internos al usuario
- [ ] Testear con inputs maliciosos

---

## 🔍 Testing de Seguridad

```typescript
// Probar con inputs maliciosos
const maliciousInputs = [
  "<script>alert('xss')</script>",
  "'; DROP TABLE users; --",
  "javascript:alert('xss')",
  "../../etc/passwd",
  "999999999999999999999", // Número muy grande
  "", // Vacío
  "   ", // Solo espacios
];

maliciousInputs.forEach(input => {
  const result = validateString(input, { required: true });
  expect(result.valid).toBe(false);
});
```

---

## 🚀 Deployment Checklist

Antes de deployar a producción:

```
Secretos:
- [ ] .env.local NO en git
- [ ] VITE_* vars en build
- [ ] Secrets en GitHub Actions configurados
- [ ] DB credentials en variables de ambiente del servidor

Headers de Seguridad:
- [ ] Content-Security-Policy configurado
- [ ] CORS limitado a dominios autorizados
- [ ] HTTPS forzado
- [ ] X-Frame-Options: DENY

Validación:
- [ ] Inputs validados en frontend y backend
- [ ] Rate limiting activo
- [ ] RLS en Supabase habilitado

Auditoría:
- [ ] Logging de acciones sensibles
- [ ] Monitoreo (Sentry, etc) configurado
- [ ] Alertas para anomalías
```

---

## 📞 Soporte

Para preguntas sobre seguridad o reporte de vulnerabilidades, contactar al equipo de seguridad.

**NO abras issues públicos para vulnerabilidades de seguridad.**

---

## 📄 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth)  
- [React Security](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
