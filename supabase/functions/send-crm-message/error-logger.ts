// Error handling utilities with structured logging
// Prevents information leakage while maintaining detailed internal logs

export interface ErrorLog {
  timestamp: string;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  requestId?: string;
}

export interface SafeErrorResponse {
  error: string;
  code: string;
  statusCode: number;
}

// Severity levels for different error types
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
}

// Error codes for different scenarios
export enum ErrorCode {
  // Validation errors (client-side, safe to expose)
  ValidationFailed = "VALIDATION_FAILED",
  InvalidEmail = "INVALID_EMAIL",
  RateLimitExceeded = "RATE_LIMIT_EXCEEDED",
  
  // Authorization errors (safe to expose, generic)
  Unauthorized = "UNAUTHORIZED",
  Forbidden = "FORBIDDEN",
  
  // Resource errors (safe to expose, generic)
  NotFound = "NOT_FOUND",
  
  // Configuration errors (DO NOT expose details)
  ConfigurationError = "CONFIGURATION_ERROR",
  MissingCredentials = "MISSING_CREDENTIALS",
  DecryptionFailed = "DECRYPTION_FAILED",
  
  // External API errors (DO NOT expose provider details)
  ExternalServiceError = "EXTERNAL_SERVICE_ERROR",
  
  // Unexpected errors (DO NOT expose details)
  InternalServerError = "INTERNAL_SERVER_ERROR",
}

// Mapping of error codes to client-safe messages
const ClientSafeMessages: Record<ErrorCode, string> = {
  [ErrorCode.ValidationFailed]: "Los datos proporcionados no son válidos",
  [ErrorCode.InvalidEmail]: "Email inválido",
  [ErrorCode.RateLimitExceeded]: "Has excedido el límite de solicitudes. Por favor, intenta más tarde",
  
  [ErrorCode.Unauthorized]: "No estás autorizado para acceder a este recurso",
  [ErrorCode.Forbidden]: "No tienes permiso para realizar esta acción",
  
  [ErrorCode.NotFound]: "El recurso solicitado no existe",
  
  [ErrorCode.ConfigurationError]: "Error de configuración del servidor. Por favor, contacta al administrador",
  [ErrorCode.MissingCredentials]: "Las credenciales necesarias no están configuradas. Por favor, contacta al administrador",
  [ErrorCode.DecryptionFailed]: "Error al procesar credenciales. Por favor, contacta al administrador",
  
  [ErrorCode.ExternalServiceError]: "Servicio externo no disponible. Por favor, intenta más tarde",
  
  [ErrorCode.InternalServerError]: "Error interno del servidor. Por favor, intenta más tarde",
};

/**
 * Structured logger that logs internally but returns safe responses to clients
 */
export class SafeErrorLogger {
  private requestId: string;
  private userId?: string;

  constructor(requestId: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId;
  }

  /**
   * Log error internally (with full details) and return safe response
   * DO NOT include error.message in client response
   */
  public logAndRespond(
    errorCode: ErrorCode,
    internalMessage: string,
    context?: Record<string, unknown>,
    originalError?: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    statusCode: number = 500
  ): SafeErrorResponse {
    // Get the stack trace from the original error if available
    let stack: string | undefined;
    if (originalError instanceof Error) {
      stack = originalError.stack;
    }

    // Create the internal error log (with full details for debugging)
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity,
      code: errorCode,
      message: internalMessage,
      context: {
        ...context,
        // Include potentially sensitive info only in internal logs
        originalErrorMessage: originalError instanceof Error ? originalError.message : String(originalError),
      },
      stack,
      userId: this.userId,
      requestId: this.requestId,
    };

    // Log internally (this goes to server logs, not to client)
    this.logInternal(errorLog);

    // Return safe response without exposing sensitive details
    return {
      error: ClientSafeMessages[errorCode] || "Ocurrió un error",
      code: errorCode,
      statusCode,
    };
  }

  /**
   * Log validation error (safe to expose details to client)
   */
  public logValidationError(
    message: string,
    context?: Record<string, unknown>
  ): SafeErrorResponse {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.WARNING,
      code: ErrorCode.ValidationFailed,
      message,
      context,
      userId: this.userId,
      requestId: this.requestId,
    };

    this.logInternal(errorLog);

    // Validation errors are safe to expose to client
    return {
      error: message,
      code: ErrorCode.ValidationFailed,
      statusCode: 400,
    };
  }

  /**
   * Log rate limit error (safe to expose)
   */
  public logRateLimitError(retryAfter: number): SafeErrorResponse {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.WARNING,
      code: ErrorCode.RateLimitExceeded,
      message: `Rate limit exceeded for user ${this.userId}`,
      context: { retryAfterSeconds: retryAfter },
      userId: this.userId,
      requestId: this.requestId,
    };

    this.logInternal(errorLog);

    return {
      error: ClientSafeMessages[ErrorCode.RateLimitExceeded],
      code: ErrorCode.RateLimitExceeded,
      statusCode: 429,
    };
  }

  /**
   * Log authorization error (safe to expose, generic)
   */
  public logAuthorizationError(
    message: string,
    isNotFound: boolean = false
  ): SafeErrorResponse {
    const code = isNotFound ? ErrorCode.NotFound : ErrorCode.Forbidden;
    const statusCode = isNotFound ? 404 : 403;

    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.WARNING,
      code,
      message: `Authorization check failed: ${message}`,
      userId: this.userId,
      requestId: this.requestId,
    };

    this.logInternal(errorLog);

    // Return NOT FOUND instead of FORBIDDEN for security
    // This prevents attackers from discovering which resources exist
    return {
      error: ClientSafeMessages[code],
      code,
      statusCode,
    };
  }

  /**
   * Log configuration/secrets error (NEVER expose details)
   */
  public logConfigurationError(
    errorType: "missing_api_key" | "missing_encryption_key" | "decryption_failed",
    originalError?: Error | unknown
  ): SafeErrorResponse {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.ERROR,
      code: ErrorCode.ConfigurationError,
      message: `Configuration error: ${errorType}`,
      context: {
        errorType,
        // Include sensitive details ONLY in internal logs
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
      },
      userId: this.userId,
      requestId: this.requestId,
    };

    this.logInternal(errorLog);

    // Return generic message without exposing which credential is missing
    return {
      error: ClientSafeMessages[ErrorCode.ConfigurationError],
      code: ErrorCode.ConfigurationError,
      statusCode: 500,
    };
  }

  /**
   * Log external service error (NEVER expose provider details)
   */
  public logExternalServiceError(
    serviceName: string, // e.g., "Resend", "Twilio"
    originalError?: Error | unknown
  ): SafeErrorResponse {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.ERROR,
      code: ErrorCode.ExternalServiceError,
      message: `${serviceName} API call failed`,
      context: {
        service: serviceName,
        // Include provider error ONLY in internal logs
        providerError: originalError instanceof Error ? originalError.message : String(originalError),
      },
      userId: this.userId,
      requestId: this.requestId,
    };

    this.logInternal(errorLog);

    // Return generic message without exposing provider details
    return {
      error: ClientSafeMessages[ErrorCode.ExternalServiceError],
      code: ErrorCode.ExternalServiceError,
      statusCode: 500,
    };
  }

  /**
   * Log unexpected error (NEVER expose details)
   */
  public logUnexpectedError(
    originalError?: Error | unknown
  ): SafeErrorResponse {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.ERROR,
      code: ErrorCode.InternalServerError,
      message: "Unexpected error occurred",
      context: {
        // Include full error ONLY in internal logs
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
      },
      stack: originalError instanceof Error ? originalError.stack : undefined,
      userId: this.userId,
      requestId: this.requestId,
    };

    this.logInternal(errorLog);

    // Return generic message without exposing any details
    return {
      error: ClientSafeMessages[ErrorCode.InternalServerError],
      code: ErrorCode.InternalServerError,
      statusCode: 500,
    };
  }

  /**
   * Internal logging - sends to server logs (not to client)
   * This is where we put sensitive details
   */
  private logInternal(errorLog: ErrorLog): void {
    // Log to console in development
    // In production, this would go to a centralized logging service (e.g., Sentry, DataDog)
    if (errorLog.severity === "error") {
      console.error(`[${errorLog.code}] ${errorLog.message}`, errorLog.context);
    } else if (errorLog.severity === "warning") {
      console.warn(`[${errorLog.code}] ${errorLog.message}`, errorLog.context);
    } else {
      console.info(`[${errorLog.code}] ${errorLog.message}`, errorLog.context);
    }

    // TODO: Send to external error tracking service if needed
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(errorLog);
    // }
  }
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
