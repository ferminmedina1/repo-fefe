/**
 * Hook para aplicar seguridad automática a mutaciones
 * Valida inputs, rate limiting y auditoría en todas las operaciones
 */

import { useCallback, useState } from "react";
import { createSecurityAlert, sendSecurityAlert } from "@/lib/security.config";
import { useRateLimitMutation, formatResetTime } from "@/lib/rateLimiter";
import { toast } from "sonner";

interface SecureMutationOptions {
  operationName: string;
  rateLimit?: "admin" | "write" | "delete" | "create" | "mutation";
  onRateLimitExceeded?: (resetTime: string) => void;
  logAudit?: boolean;
}

/**
 * Hook para ejecutar mutaciones de forma segura
 * Maneja: validación, rate limiting, logging, errores
 */
export function useSecureMutation<T extends (...args: any[]) => Promise<any>>(
  mutation: T,
  options: SecureMutationOptions
) {
  const {
    operationName = "unknown",
    rateLimit = "mutation",
    onRateLimitExceeded,
    logAudit = true,
  } = options;

  const rateLimiter = useRateLimitMutation(operationName, {
    maxRequests:
      rateLimit === "admin"
        ? 100
        : rateLimit === "write"
          ? 100
          : rateLimit === "delete"
            ? 50
            : 100,
    windowMs: 60 * 1000,
  });

  return useCallback(
    async (...args: Parameters<T>) => {
      try {
        // Verificar rate limit
        const { allowed, remainingRequests, resetTime } = rateLimiter.check();
        if (!allowed) {
          const resetIn = formatResetTime(resetTime);
          const message = `Too many ${operationName} requests. Try again in ${resetIn}`;

          // Callback custom
          onRateLimitExceeded?.(resetIn);

          // Alerta de seguridad
          if (logAudit) {
            sendSecurityAlert(
              createSecurityAlert("rate_limit_exceeded", "medium", message, {
                operation: operationName,
                remainingRequests,
              })
            );
          }

          toast.error(message);
          throw new Error("Rate limit exceeded");
        }

        // Ejecutar mutación
        const result = await mutation(...args);

        // Log auditoría
        if (logAudit) {
          console.log(`[AUDIT] ${operationName} success`, {
            timestamp: new Date().toISOString(),
            rateLimitRemaining: remainingRequests,
          });
        }

        return result;
      } catch (error) {
        // Log de error
        console.error(`[ERROR] ${operationName} failed:`, error);

        // Alerta de error sensible
        if (error instanceof Error) {
          sendSecurityAlert(
            createSecurityAlert("validation_error", "low", `${operationName} failed: ${error.message}`)
          );
        }

        throw error;
      }
    },
    [mutation, operationName, rateLimit, rateLimiter, onRateLimitExceeded, logAudit]
  );
}

/**
 * Hook para validar múltiples campos
 * Retorna todos los errores y el estado general
 */
export function useFormValidation<T extends Record<string, any>>(
  validators: Record<keyof T, (value: any) => { valid: boolean; error?: string }>
) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (values: T): boolean => {
      const newErrors: Record<string, string> = {};

      for (const [key, validator] of Object.entries(validators)) {
        const result = validator((values as any)[key]);
        if (!result.valid) {
          newErrors[key] = result.error || "Invalid value";
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [validators]
  );

  const clearError = useCallback((field: string) => {
    setErrors((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => setErrors({}), []);

  return {
    errors,
    validate,
    clearError,
    clearAllErrors,
    hasErrors: Object.keys(errors).length > 0,
  };
}
