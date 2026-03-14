/**
 * Configuración de seguridad global
 * Mejores prácticas para proteger la aplicación
 */

// ============================================================
// PROTECCIÓN DE DATOS SENSIBLES
// ============================================================

/**
 * Nunca expongas estas variables en:
 * - localStorage (accessible por JavaScript malicioso)
 * - sessionStorage
 * - URL query parameters
 * - Logging o consola
 * - Comentarios en el código
 */

// ✅ CORRECTO: Variables de ambiente durante build
const ALLOWED_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_STRIPE_PUBLIC_KEY", // SOLO la key pública
];

// ❌ NUNCA expongas:
const FORBIDDEN_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "ADMIN_PASSWORD",
  "DATABASE_PASSWORD",
  "JWT_SECRET",
  "API_SECRET_KEY",
];

// ============================================================
// VALIDACIÓN Y SANITIZACIÓN
// ============================================================

/**
 * Headers de seguridad recomendados
 */
export const SECURITY_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

/**
 * Configuración de CORS segura
 */
export const CORS_CONFIG = {
  allowedOrigins: [
    "https://verifyspace.ar",
    "https://www.verifyspace.ar",
    // NO incluir localhost en producción
  ],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};

// ============================================================
// INPUT VALIDATION RULES
// ============================================================

export const INPUT_VALIDATION_RULES = {
  // Notificaciones
  notification: {
    title: {
      minLength: 1,
      maxLength: 100,
      type: "string",
      sanitize: true,
    },
    message: {
      minLength: 1,
      maxLength: 500,
      type: "string",
      sanitize: true,
    },
    severity: {
      type: "enum",
      values: ["info", "warning", "error", "critical"],
    },
  },

  // Búsqueda
  search: {
    query: {
      maxLength: 500,
      type: "string",
      sanitize: true,
    },
  },

  // Formularios
  form: {
    email: {
      type: "email",
      maxLength: 100,
    },
    name: {
      minLength: 1,
      maxLength: 100,
      type: "string",
      sanitize: true,
    },
  },
};

// ============================================================
// RATE LIMITING DEFAULT
// ============================================================

export const DEFAULT_RATE_LIMITS = {
  // General API
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },

  // Operaciones sensibles
  mutation: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minuto
  },

  // Envío de notificaciones (muy restrictivo)
  notification: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 por minuto
  },

  // Login / Autenticación
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 5 por 15 minutos
  },

  // Búsqueda
  search: {
    maxRequests: 500,
    windowMs: 60 * 1000, // 500 por minuto
  },
};

// ============================================================
// LOGGING Y AUDITORÍA
// ============================================================

export interface AuditLog {
  timestamp: string;
  action: string;
  userId?: string;
  ipAddress?: string;
  status: "success" | "failure";
  details?: Record<string, any>;
  error?: string;
}

/**
 * Registra acciones sensibles para auditoría
 * IMPORTANTE: No loguear datos sensibles como contraseñas, keys, etc
 */
export function logAuditEvent(event: Omit<AuditLog, "timestamp">): void {
  const auditLog: AuditLog = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // TODO: Enviar a servicio de auditoría centralizado
  console.log("[AUDIT]", auditLog);
}

// ============================================================
// PROTECCIÓN CONTRA VULNERABILIDADES COMUNES
// ============================================================

/**
 * Previene contra:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection (prevenido por Supabase RLS + prepared statements)
 * - CSRF (prevenido por HTTPS + SameSite cookies)
 * - Timing attacks (usar constante-time comparison)
 */

export const SECURITY_CHECKLIST = {
  // Frontend
  frontend: [
    "✓ Usar Content Security Policy (CSP) headers",
    "✓ Sanitizar todos los inputs del usuario",
    "✓ Nunca confiar en validación solo de cliente",
    "✓ Implementar rate limiting",
    "✓ Usar HTTPS en producción",
    "✓ Actualizar dependencies regularmente",
  ],

  // API / Backend
  backend: [
    "✓ Validar inputs en servidor",
    "✓ Usar prepared statements / parameterized queries",
    "✓ Implementar Row Level Security (RLS) en Supabase",
    "✓ Rate limiting en server-side",
    "✓ Loguear acciones sensibles",
    "✓ Rotar secrets regularmente",
  ],

  // Secretos / Credenciales
  secrets: [
    "✓ Usar .env.local (NUNCA en .env.example)",
    "✓ Nunca loguear passwords o API keys",
    "✓ Usar variables de ambiente para secrets",
    "✓ Rotación periódica de credenciales",
    "✓ Usar diferentes keys para dev/prod",
  ],

  // Datos sensibles
  data: [
    "✓ Encriptar datos en tránsito (HTTPS)",
    "✓ Encriptar datos sensibles en BD (opcional)",
    "✓ Cumplir GDPR/CCPA",
    "✓ No guardar contraseñas en plain text",
  ],
};

// ============================================================
// DETECCIÓN DE ANOMALÍAS
// ============================================================

export interface SecurityAlert {
  type: "suspicious_activity" | "rate_limit_exceeded" | "validation_error" | "unauthorized_access";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export function createSecurityAlert(
  type: SecurityAlert["type"],
  severity: SecurityAlert["severity"],
  message: string,
  details?: Record<string, any>
): SecurityAlert {
  return {
    type,
    severity,
    message,
    timestamp: new Date().toISOString(),
    details,
  };
}

/**
 * Envía alerta de seguridad
 * TODO: Integrar con sistema de alertas (Sentry, etc)
 */
export function sendSecurityAlert(alert: SecurityAlert): void {
  console.warn("[SECURITY ALERT]", alert);

  // En producción, enviar a Sentry o servicio similar
  if (process.env.NODE_ENV === "production") {
    // TODO: sendToMonitoringService(alert)
  }
}
