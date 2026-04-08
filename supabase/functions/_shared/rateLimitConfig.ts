/**
 * Configuración centralizada de Rate Limiting
 * Define los límites para cada categoría de endpoint
 */

export type RateLimitCategory =
  | "auth" // Autenticación
  | "payment" // Pagos
  | "financial" // Finanzas (invoices, charges)
  | "admin" // Operaciones administrativas
  | "mutations" // Creación/actualización de datos
  | "bulk" // Operaciones en lote
  | "notifications" // Notificaciones y alertas
  | "exports" // Exportación de datos
  | "integrations" // Integraciones externas
  | "webhooks" //Webhoooks
  | "default"; // Defecto

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message: string;
}

/**
 * Configuraciones de rate limit por categoría
 * maxRequests: número máximo de requests en la ventana
 * windowMs: duración de la ventana en milisegundos
 */
export const RATE_LIMIT_CONFIG: Record<RateLimitCategory, RateLimitConfig> = {
  // 🔴 CRÍTICA: Autenticación y signup
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    message: "Demasiados intentos. Intenta nuevamente en 15 minutos.",
  },

  // 🔴 CRÍTICA: Pagos (prevención de fraude)
  payment: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
    message: "Demasiados intentos de pago. Intenta nuevamente en un momento.",
  },

  // 🔴 CRÍTICA: Finanzas (invoices, subscripciones, cargos)
  financial: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minuto
    message: "Demasiadas operaciones financieras. Intenta más tarde.",
  },

  // 🔴 CRÍTICA: Admin (operaciones destructivas)
  admin: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: "Límite de operaciones administrativas excedido.",
  },

  // 🟡 ALTA: Mutaciones de datos
  mutations: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
    message: "Demasiadas operaciones. Intenta más tarde.",
  },

  // 🟡 ALTA: Operaciones en lote
  bulk: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
    message: "Límite de importación alcanzado. Intenta más tarde.",
  },

  // 🟠 MEDIA: Notificaciones
  notifications: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minuto
    message: "Demasiadas notificaciones. Intenta más tarde.",
  },

  // 🟠 MEDIA: Exportaciones
  exports: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
    message: "Límite de exportaciones alcanzado.",
  },

  // 🟠 MEDIA: Integraciones
  integrations: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minuto
    message: "Límite de integraciones alcanzado.",
  },

  // 🟠 MEDIA: Webhooks
  webhooks: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minuto
    message: "Demasiados webhooks. Intenta más tarde.",
  },

  // Default
  default: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
    message: "Límite de rate limite excedido.",
  },
};

/**
 * Mapeo de endpoints a categorías de rate limiting
 */
export const ENDPOINT_RATE_LIMIT_MAP: Record<string, RateLimitCategory> = {
  // Autenticación
  "finalize-signup": "auth",
  "check-signup-duplicates": "auth",
  "consume-invite-token": "auth",

  // Pagos
  "create-intent": "payment",
  "create-stripe-setup-intent": "payment",
  "save-stripe-payment-method": "payment",
  "delete-payment-method": "payment",
  "create-mp-preapproval": "payment",
  "mp-create-token": "payment",
  "signup-save-payment-method": "payment",
  "start-checkout": "payment",

  // Finanzas
  "afip-facturar": "financial",
  "afip-auth": "financial",
  "charge-trial-subscriptions": "financial",
  "get-intent-status": "payment",
  "mark-intent-ready": "payment",

  // Admin
  "delete-account": "admin",
  "reset-database": "admin",
  "save-smtp-config": "admin",
  "update-platform-support-ticket-status": "admin",

  // Bulk/Imports
  "bulk-import": "bulk",

  // Notificaciones
  "send-crm-message": "notifications",
  "send-crm-notification": "notifications",
  "send-alert-email": "notifications",
  "send-bulk-email": "notifications",
  "send-customer-support-notification": "notifications",
  "send-crm-report-webhook": "notifications",
  "send-monthly-reports": "notifications",

  // Integraciones
  "integrations-get-credentials": "integrations",
  "integrations-save-credentials": "integrations",
  "integrations-ml-start": "integrations",
  "integrations-ml-callback": "integrations",

  // Webhooks
  "mercadopago-webhook": "webhooks",
  "webhooks-google-forms": "webhooks",

  // Exports/Reports
  "reports": "exports",
};

/**
 * Obtiene la categoría de rate limit para un endpoint
 */
export function getCategoryForEndpoint(endpoint: string): RateLimitCategory {
  // Buscar coincidencia exacta primero
  if (endpoint in ENDPOINT_RATE_LIMIT_MAP) {
    return ENDPOINT_RATE_LIMIT_MAP[endpoint];
  }

  // Luego buscar coincidencia parcial (para rutas como /reports/*)
  for (const [key, category] of Object.entries(ENDPOINT_RATE_LIMIT_MAP)) {
    if (endpoint.includes(key)) {
      return category;
    }
  }

  return "default";
}

/**
 * Obtiene la configuración de rate limit para un endpoint
 */
export function getRateLimitConfigForEndpoint(endpoint: string): RateLimitConfig {
  const category = getCategoryForEndpoint(endpoint);
  return RATE_LIMIT_CONFIG[category];
}

/**
 * Rate limiters especiales por endpoint
 * Para casos donde necesitamos lógica personalizada
 */
export const SPECIAL_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // reset-database: máximo 1 por hora (operación muy destructiva)
  "reset-database": {
    maxRequests: 1,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: "Solo puedes resetear la base de datos una vez por hora.",
  },

  // delete-account: máximo 1 por hora
  "delete-account": {
    maxRequests: 1,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: "Solo puedes eliminar tu cuenta una vez por hora.",
  },

  // charge-trial-subscriptions: máximo 2 veces por minuto
  "charge-trial-subscriptions": {
    maxRequests: 2,
    windowMs: 60 * 1000, // 1 minuto
    message: "Demasiados intentos de carga. Espera un momento.",
  },

  // afip-facturar: máximo 5 facturas por minuto
  "afip-facturar": {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minuto
    message: "Límite de facturas por minuto alcanzado.",
  },

  // send-bulk-email: máximo 5 por minuto
  "send-bulk-email": {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minuto
    message: "Límite de envíos en lote alcanzado.",
  },

  // bulk-import: máximo 10 importaciones por minuto
  "bulk-import": {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
    message: "Límite de importaciones alcanzado.",
  },
};

/**
 * Obtiene la configuración final (con special limits si aplica)
 */
export function getFinalRateLimitConfig(endpoint: string): RateLimitConfig {
  // Verificar si hay un límite especial
  if (endpoint in SPECIAL_RATE_LIMITS) {
    return SPECIAL_RATE_LIMITS[endpoint];
  }

  // Si no, usar la configuración normal
  return getRateLimitConfigForEndpoint(endpoint);
}
