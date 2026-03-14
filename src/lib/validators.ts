/**
 * Validadores de seguridad para inputs y datos
 * Previene inyecciones, XSS y otros ataques comunes
 */

// Patrones de validación seguros
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  title: /^[a-zA-Z0-9\s\-.,áéíóúàèìòùäëïöüñ]{1,100}$/,
  message: /^[a-zA-Z0-9\s\-.,()áéíóúàèìòùäëïöüñ\n]{1,500}$/,
  url: /^https?:\/\/.+\..+/,
  phone: /^[\d\-\+\(\) ]{5,20}$/,
  alphanumeric: /^[a-zA-Z0-9_-]{1,50}$/,
};

// Límites de longitud seguros
export const LENGTH_LIMITS = {
  title: { min: 1, max: 100 },
  message: { min: 1, max: 500 },
  description: { min: 0, max: 1000 },
  name: { min: 1, max: 100 },
  email: { min: 5, max: 100 },
  url: { min: 5, max: 2000 },
};

/**
 * Valida y sanitiza cadenas de texto
 */
export function validateString(
  value: string | null | undefined,
  options: { min?: number; max?: number; pattern?: RegExp; required?: boolean } = {}
): { valid: boolean; error?: string; value?: string } {
  const { min = 0, max = 500, pattern, required = false } = options;

  // Validar requerido
  if (required && (!value || value.trim().length === 0)) {
    return { valid: false, error: "Campo requerido" };
  }

  if (!value) {
    return { valid: true, value: "" };
  }

  const trimmed = String(value).trim();

  // Validar largo
  if (trimmed.length < min) {
    return { valid: false, error: `Mínimo ${min} caracteres` };
  }
  if (trimmed.length > max) {
    return { valid: false, error: `Máximo ${max} caracteres` };
  }

  // Validar patrón
  if (pattern && !pattern.test(trimmed)) {
    return { valid: false, error: "Formato inválido" };
  }

  return { valid: true, value: trimmed };
}

/**
 * Valida email
 */
export function validateEmail(email: string | null | undefined): { valid: boolean; error?: string; value?: string } {
  if (!email) {
    return { valid: false, error: "Email requerido" };
  }

  const trimmed = String(email).trim().toLowerCase();

  if (trimmed.length > LENGTH_LIMITS.email.max) {
    return { valid: false, error: `Email muy largo (máximo ${LENGTH_LIMITS.email.max} caracteres)` };
  }

  if (!VALIDATION_PATTERNS.email.test(trimmed)) {
    return { valid: false, error: "Email inválido" };
  }

  return { valid: true, value: trimmed };
}

/**
 * Valida números
 */
export function validateNumber(
  value: any,
  options: { min?: number; max?: number; required?: boolean; integer?: boolean } = {}
): { valid: boolean; error?: string; value?: number } {
  const { min = -Infinity, max = Infinity, required = false, integer = false } = options;

  if (value === null || value === undefined || value === "") {
    if (required) {
      return { valid: false, error: "Campo requerido" };
    }
    return { valid: true, value: 0 };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: "Debe ser un número" };
  }

  if (integer && !Number.isInteger(num)) {
    return { valid: false, error: "Debe ser un número entero" };
  }

  if (num < min) {
    return { valid: false, error: `Mínimo ${min}` };
  }

  if (num > max) {
    return { valid: false, error: `Máximo ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Valida título de notificación
 */
export function validateNotificationTitle(title: string | null | undefined): { valid: boolean; error?: string; value?: string } {
  return validateString(title, {
    min: LENGTH_LIMITS.title.min,
    max: LENGTH_LIMITS.title.max,
    pattern: VALIDATION_PATTERNS.title,
    required: true,
  });
}

/**
 * Valida mensaje de notificación
 */
export function validateNotificationMessage(message: string | null | undefined): { valid: boolean; error?: string; value?: string } {
  return validateString(message, {
    min: LENGTH_LIMITS.message.min,
    max: LENGTH_LIMITS.message.max,
    pattern: VALIDATION_PATTERNS.message,
    required: true,
  });
}

/**
 * Valida UUID
 */
export function validateUUID(uuid: string | null | undefined): { valid: boolean; error?: string; value?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuid) {
    return { valid: false, error: "ID requerido" };
  }

  if (!uuidRegex.test(String(uuid))) {
    return { valid: false, error: "ID inválido" };
  }

  return { valid: true, value: String(uuid).toLowerCase() };
}

/**
 * Sanitiza HTML para prevenir XSS
 */
export function sanitizeHTML(html: string): string {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Valida objeto de notificación completo
 */
export function validateNotificationInput(data: any): {
  valid: boolean;
  errors: Record<string, string>;
  data?: {
    title: string;
    message: string;
    notification_type: string;
    severity: string;
    company_id?: string;
  };
} {
  const errors: Record<string, string> = {};

  // Validar title
  const titleValidation = validateNotificationTitle(data?.title);
  if (!titleValidation.valid) {
    errors.title = titleValidation.error || "Título inválido";
  }

  // Validar message
  const messageValidation = validateNotificationMessage(data?.message);
  if (!messageValidation.valid) {
    errors.message = messageValidation.error || "Mensaje inválido";
  }

  // Validar tipo
  const validTypes = ["payment_overdue", "payment_due", "trial_ending", "subscription_ending", "new_support_ticket", "system_maintenance", "system_update", "general"];
  if (!data?.notification_type || !validTypes.includes(String(data.notification_type))) {
    errors.notification_type = "Tipo de notificación inválido";
  }

  // Validar severidad
  const validSeverities = ["info", "warning", "error", "critical"];
  if (!data?.severity || !validSeverities.includes(String(data.severity))) {
    errors.severity = "Severidad inválida";
  }

  // Validar company_id si está presente
  if (data?.company_id) {
    const companyIdValidation = validateUUID(data.company_id);
    if (!companyIdValidation.valid) {
      errors.company_id = "ID de empresa inválido";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      title: titleValidation.value!,
      message: messageValidation.value!,
      notification_type: String(data.notification_type),
      severity: String(data.severity),
      company_id: data?.company_id,
    },
  };
}

/**
 * Validador genérico para objetos
 */
export function validateObject<T>(
  data: unknown,
  schema: Record<string, (value: any) => { valid: boolean; error?: string; value?: any }>
): {
  valid: boolean;
  errors: Record<string, string>;
  data?: T;
} {
  const errors: Record<string, string> = {};
  const validatedData: any = {};

  for (const [key, validator] of Object.entries(schema)) {
    const result = validator((data as any)?.[key]);
    if (!result.valid) {
      errors[key] = result.error || "Valor inválido";
    } else {
      validatedData[key] = result.value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: {}, data: validatedData as T };
}
