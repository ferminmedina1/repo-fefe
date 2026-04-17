/**
 * Utilidades para facilitar la implementación de Rate Limiting
 * en Edge Functions
 */

import {
  checkRateLimitByUser,
  checkRateLimitByIP,
  extractIP,
} from "./rateLimitMiddleware.ts";
import type { RateLimitCategory } from "./rateLimitConfig.ts";

interface RateLimitOptions {
  // Tipo de rate limit
  type: "user" | "ip";
  // ID del usuario (si type === "user")
  userId?: string;
  // Request (si type === "ip")
  req?: Request;
  // Nombre del endpoint
  endpoint: string;
  // Categoría (auth, payment, financial, etc)
  category?: RateLimitCategory;
}

/**
 * Middleware helper para aplicar rate limiting en edge functions
 * Retorna la respuesta de error si se excede el límite
 */
export async function applyRateLimit(
  options: RateLimitOptions,
  corsHeaders?: Record<string, string>
): Promise<{ error?: Response; headers?: Record<string, string> }> {
  try {
    let rateLimitCheck;

    if (options.type === "user") {
      if (!options.userId) {
        throw new Error("userId requerido para type='user'");
      }
      rateLimitCheck = await checkRateLimitByUser(
        options.userId,
        options.endpoint,
        options.category
      );
    } else if (options.type === "ip") {
      if (!options.req) {
        throw new Error("req requerido para type='ip'");
      }
      const ip = extractIP(options.req);
      rateLimitCheck = await checkRateLimitByIP(
        ip,
        options.endpoint,
        options.category
      );
    } else {
      throw new Error(`Tipo desconocido: ${options.type}`);
    }

    if (!rateLimitCheck.allowed) {
      const headers = {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...rateLimitCheck.headers,
      };

      const errorResponse = new Response(
        JSON.stringify({
          error: rateLimitCheck.message || "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          remaining: rateLimitCheck.remaining,
          resetAt: Math.ceil(rateLimitCheck.resetAt / 1000),
        }),
        { status: 429, headers }
      );

      return { error: errorResponse };
    }

    return { headers: rateLimitCheck.headers };
  } catch (error) {
    console.error("[Rate Limit] Error:", error);
    // En caso de error, permitir la solicitud pero loguear
    return { headers: {} };
  }
}

/**
 * Versión simplificada para endpoints autenticados
 */
export async function applyRateLimitUser(
  userId: string,
  endpoint: string,
  category?: RateLimitCategory,
  corsHeaders?: Record<string, string>
): Promise<{ error?: Response; headers?: Record<string, string> }> {
  return applyRateLimit(
    { type: "user", userId, endpoint, category },
    corsHeaders
  );
}

/**
 * Versión simplificada para endpoints públicos
 */
export async function applyRateLimitIP(
  req: Request,
  endpoint: string,
  category?: RateLimitCategory,
  corsHeaders?: Record<string, string>
): Promise<{ error?: Response; headers?: Record<string, string> }> {
  return applyRateLimit(
    { type: "ip", req, endpoint, category },
    corsHeaders
  );
}

/**
 * Helper para agregar headers de rate limit a una respuesta
 */
export function addRateLimitHeaders(
  response: Response,
  headers: Record<string, string>
): Response {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Validador de rate limit que retorna un JSON error directamente
 * Uso: Si el resultado es true, significa que el error fue retornado
 */
export async function rateLimitOrContinue(
  options: RateLimitOptions,
  corsHeaders?: Record<string, string>
): Promise<{ blocked: boolean; response?: Response }> {
  const result = await applyRateLimit(options, corsHeaders);
  return {
    blocked: !!result.error,
    response: result.error,
  };
}
