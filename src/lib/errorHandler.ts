/**
 * Error Handler Service
 * Manejo centralizado de errores con logging y mensajes amigables
 */

import { auditLogger } from './auditLog';

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  details?: Record<string, any>;
  timestamp: string;
}

const ERROR_MESSAGES: Record<string, { message: string; userMessage: string; severity: ErrorSeverity }> = {
  // Errores de validación
  VALIDATION_ERROR: {
    message: 'Validation failed',
    userMessage: 'Los datos ingresados no son válidos',
    severity: ErrorSeverity.WARNING,
  },
  INVALID_SKU: {
    message: 'SKU already exists',
    userMessage: 'Este SKU ya existe en la empresa',
    severity: ErrorSeverity.WARNING,
  },
  INVALID_BARCODE: {
    message: 'Barcode already exists',
    userMessage: 'Este código de barras ya existe en la empresa',
    severity: ErrorSeverity.WARNING,
  },
  INVALID_IMAGE: {
    message: 'Invalid image file',
    userMessage: 'El archivo de imagen no es válido',
    severity: ErrorSeverity.WARNING,
  },
  IMAGE_TOO_LARGE: {
    message: 'Image size exceeds maximum',
    userMessage: 'La imagen es demasiado grande (máximo 10MB)',
    severity: ErrorSeverity.WARNING,
  },

  // Errores de permisos
  PERMISSION_DENIED: {
    message: 'User lacks required permission',
    userMessage: 'No tienes permiso para realizar esta acción',
    severity: ErrorSeverity.WARNING,
  },
  UNAUTHORIZED: {
    message: 'User is not authenticated',
    userMessage: 'Debes iniciar sesión para continuar',
    severity: ErrorSeverity.ERROR,
  },
  COMPANY_NOT_SELECTED: {
    message: 'No company selected',
    userMessage: 'Selecciona una empresa antes de continuar',
    severity: ErrorSeverity.WARNING,
  },

  // Errores de datos
  STOCK_INCONSISTENCY: {
    message: 'Stock values do not match',
    userMessage: 'El stock total no coincide con la suma de depósitos',
    severity: ErrorSeverity.ERROR,
  },
  INVALID_PRICE_CHANGE: {
    message: 'Price change exceeds maximum allowed',
    userMessage: 'El cambio de precio es muy radical',
    severity: ErrorSeverity.WARNING,
  },
  WAREHOUSE_DISTRIBUTION_MISMATCH: {
    message: 'Warehouse distribution does not match total stock',
    userMessage: 'La distribución en depósitos no coincide con el stock total',
    severity: ErrorSeverity.WARNING,
  },

  // Errores de base de datos
  DATABASE_ERROR: {
    message: 'Database operation failed',
    userMessage: 'Error en la base de datos. Intenta nuevamente',
    severity: ErrorSeverity.ERROR,
  },
  RLS_POLICY_VIOLATION: {
    message: 'Row-level security policy violation',
    userMessage: 'No tienes acceso a estos datos',
    severity: ErrorSeverity.ERROR,
  },
  DUPLICATE_KEY: {
    message: 'Duplicate key constraint violated',
    userMessage: 'Este registro ya existe',
    severity: ErrorSeverity.WARNING,
  },
  FOREIGN_KEY_VIOLATION: {
    message: 'Foreign key constraint violated',
    userMessage: 'Esta operación no puede completarse (referencia inválida)',
    severity: ErrorSeverity.ERROR,
  },

  // Errores de operaciones
  IMPORT_FAILED: {
    message: 'CSV import failed',
    userMessage: 'Error al importar el archivo CSV',
    severity: ErrorSeverity.ERROR,
  },
  EXPORT_FAILED: {
    message: 'Export operation failed',
    userMessage: 'Error al exportar los datos',
    severity: ErrorSeverity.ERROR,
  },
  BATCH_OPERATION_PARTIAL_FAILURE: {
    message: 'Batch operation completed with some failures',
    userMessage: 'Algunos elementos no pudieron procesarse',
    severity: ErrorSeverity.WARNING,
  },

  // Errores de red/servidor
  NETWORK_ERROR: {
    message: 'Network connection failed',
    userMessage: 'Error de conexión. Verifica tu conexión a internet',
    severity: ErrorSeverity.ERROR,
  },
  TIMEOUT: {
    message: 'Operation timed out',
    userMessage: 'La operación tardó demasiado. Intenta nuevamente',
    severity: ErrorSeverity.ERROR,
  },
  SERVER_ERROR: {
    message: 'Server error occurred',
    userMessage: 'Error del servidor. Por favor contacta soporte',
    severity: ErrorSeverity.CRITICAL,
  },

  // Errores genéricos
  UNKNOWN_ERROR: {
    message: 'An unknown error occurred',
    userMessage: 'Ocurrió un error inesperado',
    severity: ErrorSeverity.ERROR,
  },
};

/**
 * Crea un error estructurado
 */
export function createAppError(
  code: string,
  details?: Record<string, any>
): AppError {
  const errorDef = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;

  return {
    code,
    message: errorDef.message,
    userMessage: errorDef.userMessage,
    severity: errorDef.severity,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Determina el codigo de error basado en una excepción
 */
export function classifyError(error: any): string {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase() || '';

  // Errores de Zod
  if (error instanceof Error && error.name === 'ZodError') {
    return 'VALIDATION_ERROR';
  }

  // Errores de RLS
  if (message.includes('row-level security') || message.includes('rls') || code.includes('pgrst')) {
    return 'RLS_POLICY_VIOLATION';
  }

  // Errores de duplicación
  if (message.includes('duplicate') || code.includes('23505')) {
    return 'DUPLICATE_KEY';
  }

  // Errores de foreign key
  if (message.includes('foreign key') || code.includes('23503')) {
    return 'FOREIGN_KEY_VIOLATION';
  }

  // SKU/Barcode existentes
  if (message.includes('sku')) {
    return 'INVALID_SKU';
  }
  if (message.includes('barcode')) {
    return 'INVALID_BARCODE';
  }

  // Errores de red
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return 'NETWORK_ERROR';
  }

  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'TIMEOUT';
  }

  // Stock inconsistency
  if (message.includes('stock') && message.includes('inconsistent')) {
    return 'STOCK_INCONSISTENCY';
  }

  // Database errors
  if (code.includes('pgrst') || message.includes('database')) {
    return 'DATABASE_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Loguea un error con contexto
 */
export async function logErrorWithContext(
  error: any,
  context: {
    action: string;
    resourceId?: string;
    userId?: string;
    companyId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const errorCode = classifyError(error);
  const appError = createAppError(errorCode, {
    originalMessage: error?.message,
    originalCode: error?.code,
    ...context.metadata,
  });

  console.error(`[${errorCode}]`, appError);

  // Loguear en auditoría si tenemos contexto de usuario
  if (context.userId && context.companyId) {
    try {
      await auditLogger.logError(
        'UPDATE' as any,
        context.resourceId || 'unknown',
        'product' as any,
        error,
        context.companyId,
        context.metadata
      );
    } catch (auditError) {
      console.error('Failed to log error to audit:', auditError);
    }
  }
}

/**
 * Transforma un error para mostrar al usuario
 */
export function getUserFriendlyError(error: any): string {
  const code = classifyError(error);
  const appError = createAppError(code);
  return appError.userMessage;
}

/**
 * Wrapper para operaciones con manejo automático de errores
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    action: string;
    resourceId?: string;
    userId?: string;
    companyId?: string;
  }
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    await logErrorWithContext(error, context);
    return {
      success: false,
      error: getUserFriendlyError(error),
    };
  }
}
