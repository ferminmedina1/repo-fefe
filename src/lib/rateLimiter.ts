/**
 * Rate Limiting para seguridad
 * Previene abusos y ataques de fuerza bruta
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private defaultWindowMs = 60 * 1000; // 1 minuto
  private defaultMaxRequests = 30;

  /**
   * Verifica si un cliente ha excedido el límite de rate
   */
  checkLimit(
    key: string,
    options: {
      windowMs?: number;
      maxRequests?: number;
    } = {}
  ): { allowed: boolean; remainingRequests: number; resetTime: number } {
    const windowMs = options.windowMs || this.defaultWindowMs;
    const maxRequests = options.maxRequests || this.defaultMaxRequests;
    const now = Date.now();

    let entry = this.limits.get(key);

    // Si no existe o expiró, crear nueva entrada
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      this.limits.set(key, entry);
    }

    entry.count++;

    const allowed = entry.count <= maxRequests;
    const remainingRequests = Math.max(0, maxRequests - entry.count);
    const resetTime = entry.resetTime;

    return { allowed, remainingRequests, resetTime };
  }

  /**
   * Reset manual de límites para un cliente
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Limpia entradas expiradas (ejecutar periódicamente)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Instancias específicas de rate limiting
export const globalRateLimiter = new RateLimiter();

export const apiRateLimiter = new RateLimiter();

// Rate limiters especializados por operación
const rateLimiters = new Map<string, RateLimiter>();

export function getRateLimiter(operation: string): RateLimiter {
  if (!rateLimiters.has(operation)) {
    rateLimiters.set(operation, new RateLimiter());
  }
  return rateLimiters.get(operation)!;
}

/**
 * Hook para Rate Limiting en mutaciones
 * Uso: useRateLimit("send-notification", { maxRequests: 10, windowMs: 60000 })
 */
export function useRateLimitMutation(
  operationName: string,
  options: { maxRequests?: number; windowMs?: number; userId?: string } = {}
) {
  const limiter = getRateLimiter(operationName);
  // Usar userId si está disponible, sino usar localStorage
  const clientId = options.userId || getClientId();

  return {
    check: () => {
      return limiter.checkLimit(clientId, {
        maxRequests: options.maxRequests || 30,
        windowMs: options.windowMs || 60 * 1000,
      });
    },
    reset: () => {
      limiter.reset(clientId);
    },
  };
}

/**
 * Obtiene ID de cliente único
 */
function getClientId(): string {
  let clientId = localStorage.getItem("_client_id");
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("_client_id", clientId);
  }
  return clientId;
}

/**
 * Predefiniciones de límites por tipo de operación
 */
export const RATE_LIMIT_PRESETS = {
  // Operaciones administrativas (más restrictivas)
  admin: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 por minuto

  // Envío de notificaciones (muy restrictivo)
  sendNotification: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 por minuto

  // Operaciones de lectura (permisivo)
  read: { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 por minuto

  // Operaciones de escritura (moderado)
  write: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 por minuto

  // Login (muy restrictivo, previene fuerza bruta)
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 por 15 minutos

  // API rate limiting general
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 por minuto

  // Búsqueda (permisivo)
  search: { maxRequests: 500, windowMs: 60 * 1000 }, // 500 por minuto
};

/**
 * Hook para usar rate limiting con presets
 */
export function useRateLimitWithPreset(operation: string, preset: keyof typeof RATE_LIMIT_PRESETS) {
  const config = RATE_LIMIT_PRESETS[preset];
  return useRateLimitMutation(operation, config);
}

/**
 * Formatea tiempo de reset en legible
 */
export function formatResetTime(resetTimeMs: number): string {
  const secondsRemaining = Math.ceil((resetTimeMs - Date.now()) / 1000);
  if (secondsRemaining <= 0) return "Ahora";
  if (secondsRemaining < 60) return `${secondsRemaining}s`;
  const minutesRemaining = Math.ceil(secondsRemaining / 60);
  return `${minutesRemaining}m`;
}

// Ejecutar cleanup periódicamente
if (typeof window !== "undefined") {
  setInterval(() => {
    globalRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 60 * 1000); // Cada minuto
}
