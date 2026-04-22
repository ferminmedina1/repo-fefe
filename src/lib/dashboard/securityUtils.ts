/**
 * Dashboard Security Utilities
 * Funciones para prevenir vulnerabilidades comunes (XSS, injection, etc.)
 */

/**
 * Escapa contenido HTML para prevenir XSS
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Valida y sanitiza URLs
 * Solo permite protocolos seguros (https, http, mailto, tel)
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      console.warn(`[Security] URL con protocolo no permitido: ${parsed.protocol}`);
      return null;
    }

    return url;
  } catch {
    // URL inválida
    return null;
  }
}

/**
 * Valida y sanitiza atributos de datos
 * Previene inyección de propiedades peligrosas
 */
export function sanitizeAttributes(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const [key, value] of Object.entries(obj)) {
    // Evitar prototype pollution
    if (dangerousKeys.includes(key)) {
      console.warn(`[Security] Atributo peligroso detectado: ${key}`);
      continue;
    }

    // Sanitizar valores según su tipo
    if (typeof value === 'string') {
      sanitized[key] = escapeHTML(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAttributes(value);
    } else if (typeof value === 'function') {
      console.warn(`[Security] Función en atributos detectada: ${key}`);
      continue;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Valida headers de contenido
 */
export function validateContentHeaders(headers: Record<string, string>): boolean {
  const restrictedHeaders = [
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'set-cookie',
  ];

  for (const header of Object.keys(headers)) {
    if (restrictedHeaders.includes(header.toLowerCase())) {
      console.warn(`[Security] Header restringido detectado: ${header}`);
      return false;
    }
  }

  return true;
}

/**
 * Validar y sanitizar JSON de datos
 */
export function validateJSONData(jsonString: string): { valid: boolean; data: any; error: string | null } {
  try {
    const data = JSON.parse(jsonString);
    
    // Verificar que no sea circular
    const seen = new WeakSet();
    const hasCircular = (obj: any) => {
      if (obj !== null && typeof obj === 'object') {
        if (seen.has(obj)) return true;
        seen.add(obj);
        for (const value of Object.values(obj)) {
          if (hasCircular(value)) return true;
        }
      }
      return false;
    };

    if (hasCircular(data)) {
      return {
        valid: false,
        data: null,
        error: 'JSON contiene referencias circulares',
      };
    }

    return {
      valid: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      data: null,
      error: `JSON inválido: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Valida headers personalizados en requests
 */
export function validateRequestHeaders(headers: any): boolean {
  if (!headers || typeof headers !== 'object') {
    return false;
  }

  // Verificar que no contenga null bytes
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key === 'string' && key.includes('\0')) {
      console.warn('[Security] Header con null byte detectado');
      return false;
    }
    if (typeof value === 'string' && value.includes('\0')) {
      console.warn('[Security] Header value con null byte detectado');
      return false;
    }
  }

  return true;
}

/**
 * Limpia datos sensibles antes de logging
 */
export function sanitizeForLogging(data: any, sensitiveKeys = ['password', 'token', 'secret', 'api_key']): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '***REDACTED***';
    }
  }

  return sanitized;
}

/**
 * Validar tamaño de payload
 */
export function validatePayloadSize(
  data: any,
  maxSizeBytes = 5 * 1024 * 1024
): { valid: boolean; sizeBytes: number; error: string | null } {
  try {
    const serialized = JSON.stringify(data);
    const sizeBytes = new Blob([serialized]).size;

    if (sizeBytes > maxSizeBytes) {
      return {
        valid: false,
        sizeBytes,
        error: `Payload demasiado grande: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB (máximo: ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    return {
      valid: true,
      sizeBytes,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      sizeBytes: 0,
      error: `Error calculando tamaño: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Crea hash simple para detectar cambios de datos
 */
export function createDataHash(data: any): string {
  const serialized = JSON.stringify(data);
  let hash = 0;

  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Valida versión de componente/widget
 */
export function validateComponentVersion(
  componentName: string,
  requiredVersion: string,
  currentVersion: string
): boolean {
  // Simple semver comparison (major.minor.patch)
  const [reqMajor, reqMinor] = requiredVersion.split('.').map(Number);
  const [curMajor, curMinor] = currentVersion.split('.').map(Number);

  if (curMajor < reqMajor) {
    console.warn(
      `[Security] ${componentName} requiere versión ${requiredVersion} pero encontró ${currentVersion}`
    );
    return false;
  }

  if (curMajor === reqMajor && curMinor < reqMinor) {
    console.warn(
      `[Security] ${componentName} requiere versión ${requiredVersion} pero encontró ${currentVersion}`
    );
    return false;
  }

  return true;
}
