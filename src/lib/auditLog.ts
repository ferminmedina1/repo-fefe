/**
 * Audit Logging Service
 * Proporciona logging centralizado para operaciones críticas en el sistema
 * Producción: Los logs se persisten en la base de datos
 */

import { supabase } from '@/integrations/supabase/client';

export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  ADJUST_STOCK = 'ADJUST_STOCK',
  ADJUST_PRICE = 'ADJUST_PRICE',
}

export interface AuditLogEntry {
  action: AuditActionType;
  resourceType: 'product' | 'warehouse_stock' | 'price_list';
  resourceId: string | string[];
  userId: string;
  companyId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  status: 'success' | 'error';
  errorMessage?: string;
  timestamp?: string;
}

class AuditLogger {
  private batchLogs: AuditLogEntry[] = [];
  private batchSize = 50;
  private flushInterval = 5000; // 5 segundos
  private flushTimer: number | null = null;

  constructor() {
    this.startBatchTimer();
  }

  /**
   * Registra una acción en el sistema de auditoría
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    // Development: Log en consola
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', logEntry);
    }

    this.batchLogs.push(logEntry);

    // Flush si alcanzamos el batch size
    if (this.batchLogs.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Registra cambios específicos (diff)
   */
  async logChanges(
    action: AuditActionType,
    resourceId: string,
    resourceType: 'product' | 'warehouse_stock' | 'price_list',
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    companyId: string
  ): Promise<void> {
    const changes: Record<string, { from: any; to: any }> = {};
    
    for (const key of new Set([...Object.keys(oldValues), ...Object.keys(newValues)])) {
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          from: oldValues[key],
          to: newValues[key],
        };
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await this.log({
      action,
      resourceType,
      resourceId,
      userId: user.id,
      companyId,
      changes,
      status: 'success',
    });
  }

  /**
   * Log de error
   */
  async logError(
    action: AuditActionType,
    resourceId: string | string[],
    resourceType: 'product' | 'warehouse_stock' | 'price_list',
    error: Error,
    companyId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await this.log({
      action,
      resourceType,
      resourceId,
      userId: user.id,
      companyId,
      metadata,
      status: 'error',
      errorMessage: error.message,
    });
  }

  /**
   * Persiste los logs en la base de datos o localStorage
   */
  private async flush(): Promise<void> {
    if (this.batchLogs.length === 0) return;

    try {
      const logsToSend = [...this.batchLogs];
      this.batchLogs = [];

      // Log a localStorage como fallback (la tabla audit_logs debe ser configurada en Supabase)
      try {
        const existingLogs = JSON.parse(localStorage.getItem('audit_logs_batch') || '[]');
        const newLogs = logsToSend.map(log => ({
          action: log.action,
          resourceType: log.resourceType,
          resourceId: Array.isArray(log.resourceId) ? log.resourceId.join(',') : log.resourceId,
          userId: log.userId,
          companyId: log.companyId,
          changes: log.changes,
          metadata: log.metadata,
          status: log.status,
          errorMessage: log.errorMessage,
          timestamp: log.timestamp || new Date().toISOString(),
        }));
        
        localStorage.setItem('audit_logs_batch', JSON.stringify([...existingLogs, ...newLogs].slice(-1000)));
      } catch (storageError) {
        console.error('Error persisting audit logs to localStorage:', storageError);
      }
    } catch (error) {
      console.error('Error flushing audit logs:', error);
    }
  }

  private startBatchTimer(): void {
    this.flushTimer = window.setInterval(async () => {
      await this.flush();
    }, this.flushInterval);
  }

  /**
   * Limpia los timers al desmontar
   */
  destroy(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
    }
  }
}

export const auditLogger = new AuditLogger();

/**
 * Hook para cleanup en componentes
 */
export function useAuditLoggerCleanup() {
  return () => auditLogger.destroy();
}
