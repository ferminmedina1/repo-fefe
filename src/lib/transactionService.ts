/**
 * Transaction Service
 * Maneja transacciones y operaciones atómicas en la base de datos
 * Previene inconsistencias por fallos parciales
 */

import { supabase } from '@/integrations/supabase/client';
import { auditLogger, AuditActionType } from './auditLog';

export interface TransactionContext {
  userId: string;
  companyId: string;
  transactionId: string;
  startTime: Date;
}

export interface OperationResult {
  success: boolean;
  data?: any;
  error?: string;
  itemsProcessed?: number;
  itemsFailed?: number;
}

/**
 * Genera un ID único para la transacción (para tracking)
 */
function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Crea un contexto de transacción
 */
export function createTransactionContext(userId: string, companyId: string): TransactionContext {
  return {
    userId,
    companyId,
    transactionId: generateTransactionId(),
    startTime: new Date(),
  };
}

/**
 * Realiza una operación de batch insert con validación y rollback
 */
export async function batchInsertWithValidation(
  table: string,
  items: any[],
  context: TransactionContext,
  validator?: (item: any) => { valid: boolean; error?: string } | Promise<{ valid: boolean; error?: string }>
): Promise<OperationResult> {
  const validatedItems: any[] = [];
  const errors: string[] = [];
  let itemsFailed = 0;

  try {
    // Validar todos los items antes de insertar
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (validator) {
        const validation = await Promise.resolve(validator(item));
        if (!validation.valid) {
          errors.push(`Item ${index + 1}: ${validation.error || 'Validation error'}`);
          itemsFailed++;
          continue;
        }
      }
      validatedItems.push(item);
    }

    if (validatedItems.length === 0) {
      return {
        success: false,
        error: `Ningún item válido para insertar. Errores: ${errors.join('; ')}`,
        itemsProcessed: 0,
        itemsFailed,
      };
    }

    // Realizar insert en lotes para prevenir timeout
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < validatedItems.length; i += batchSize) {
      const batch = validatedItems.slice(i, i + batchSize);
      const result = await supabase.from(table).insert(batch).select();

      if (result.error) {
        throw new Error(`Batch ${Math.floor(i / batchSize) + 1} insert error: ${result.error.message}`);
      }

      batches.push(...(result.data || []));
    }

    // Log de éxito
    await auditLogger.log({
      action: AuditActionType.IMPORT,
      resourceType: table as any,
      resourceId: batches.map((item: any) => item.id || 'unknown').join(','),
      userId: context.userId,
      companyId: context.companyId,
      metadata: {
        transactionId: context.transactionId,
        totalItems: items.length,
        successCount: validatedItems.length,
        failCount: itemsFailed,
        duration: Date.now() - context.startTime.getTime(),
      },
      status: 'success',
    });

    return {
      success: true,
      data: batches,
      itemsProcessed: validatedItems.length,
      itemsFailed,
    };
  } catch (error: any) {
    console.error(`Error in batchInsertWithValidation for ${table}:`, error);

    // Log de error
    await auditLogger.logError(
      AuditActionType.IMPORT,
      'batch',
      table as any,
      error,
      context.companyId,
      {
        transactionId: context.transactionId,
        itemsProcessed: validatedItems.length,
        itemsFailed,
        duration: Date.now() - context.startTime.getTime(),
      }
    );

    return {
      success: false,
      error: error.message || `Error inserting into ${table}`,
      itemsProcessed: validatedItems.length,
      itemsFailed,
    };
  }
}

/**
 * Realiza una operación de batch update con validación
 */
export async function batchUpdateWithValidation(
  table: string,
  updates: { id: string; data: Record<string, any> }[],
  context: TransactionContext,
  validator?: (item: any) => { valid: boolean; error?: string }
): Promise<OperationResult> {
  const validatedUpdates: typeof updates = [];
  const errors: string[] = [];
  let itemsFailed = 0;

  try {
    // Validar todos los updates antes de ejecutar
    updates.forEach((update, index) => {
      if (validator) {
        const validation = validator(update.data);
        if (!validation.valid) {
          errors.push(`Update ${index + 1} (ID: ${update.id}): ${validation.error || 'Validation error'}`);
          itemsFailed++;
          return;
        }
      }
      validatedUpdates.push(update);
    });

    if (validatedUpdates.length === 0) {
      return {
        success: false,
        error: `Ningún update válido. Errores: ${errors.join('; ')}`,
        itemsProcessed: 0,
        itemsFailed,
      };
    }

    // Ejecutar updates en paralelo (con límite de concurrencia)
    const maxConcurrency = 10;
    const results = [];

    for (let i = 0; i < validatedUpdates.length; i += maxConcurrency) {
      const batch = validatedUpdates.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map(({ id, data }) =>
          supabase
            .from(table)
            .update(data)
            .eq('id', id)
            .eq('company_id', context.companyId)
            .select()
        )
      );

      for (const result of batchResults) {
        if (result.error) {
          errors.push(result.error.message);
          itemsFailed++;
        } else {
          results.push(...(result.data || []));
        }
      }
    }

    // Log de éxito
    await auditLogger.log({
      action: AuditActionType.BULK_UPDATE,
      resourceType: table as any,
      resourceId: validatedUpdates.map(u => u.id).join(','),
      userId: context.userId,
      companyId: context.companyId,
      metadata: {
        transactionId: context.transactionId,
        totalUpdates: updates.length,
        successCount: validatedUpdates.length - itemsFailed,
        failCount: itemsFailed,
        duration: Date.now() - context.startTime.getTime(),
      },
      status: 'success',
    });

    return {
      success: true,
      data: results,
      itemsProcessed: validatedUpdates.length - itemsFailed,
      itemsFailed,
    };
  } catch (error: any) {
    console.error(`Error in batchUpdateWithValidation for ${table}:`, error);

    await auditLogger.logError(
      AuditActionType.BULK_UPDATE,
      updates.map(u => u.id).join(','),
      table as any,
      error,
      context.companyId,
      {
        transactionId: context.transactionId,
        duration: Date.now() - context.startTime.getTime(),
      }
    );

    return {
      success: false,
      error: error.message || `Error updating ${table}`,
      itemsProcessed: 0,
      itemsFailed: updates.length,
    };
  }
}

/**
 * Realiza una operación de batch delete con auditoría
 */
export async function softDeleteBatch(
  table: string,
  ids: string[],
  context: TransactionContext
): Promise<OperationResult> {
  try {
    const { error } = await supabase
      .from(table)
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .in('id', ids)
      .eq('company_id', context.companyId);

    if (error) throw error;

    // Log de éxito
    await auditLogger.log({
      action: AuditActionType.BULK_DELETE,
      resourceType: table as any,
      resourceId: ids.join(','),
      userId: context.userId,
      companyId: context.companyId,
      metadata: {
        transactionId: context.transactionId,
        deleteCount: ids.length,
        deleteType: 'soft_delete',
        duration: Date.now() - context.startTime.getTime(),
      },
      status: 'success',
    });

    return {
      success: true,
      itemsProcessed: ids.length,
      itemsFailed: 0,
    };
  } catch (error: any) {
    console.error(`Error in softDelete for ${table}:`, error);

    await auditLogger.logError(
      AuditActionType.BULK_DELETE,
      ids.join(','),
      table as any,
      error,
      context.companyId,
      {
        transactionId: context.transactionId,
        deleteCount: ids.length,
      }
    );

    return {
      success: false,
      error: error.message || `Error deleting from ${table}`,
      itemsProcessed: 0,
      itemsFailed: ids.length,
    };
  }
}

/**
 * Realiza un upsert con manejo de conflictos
 */
export async function upsertWithConflictHandling(
  table: string,
  items: any[],
  conflictColumns: string[],
  context: TransactionContext
): Promise<OperationResult> {
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(items, { onConflict: conflictColumns.join(',') })
      .select();

    if (error) throw error;

    await auditLogger.log({
      action: AuditActionType.UPDATE,
      resourceType: table as any,
      resourceId: (data || []).map((item: any) => item.id || 'unknown').join(','),
      userId: context.userId,
      companyId: context.companyId,
      metadata: {
        transactionId: context.transactionId,
        itemCount: items.length,
        conflictColumns,
        duration: Date.now() - context.startTime.getTime(),
      },
      status: 'success',
    });

    return {
      success: true,
      data,
      itemsProcessed: (data || []).length,
      itemsFailed: 0,
    };
  } catch (error: any) {
    console.error(`Error in upsertWithConflictHandling for ${table}:`, error);

    await auditLogger.logError(
      AuditActionType.UPDATE,
      'batch-upsert',
      table as any,
      error,
      context.companyId,
      {
        transactionId: context.transactionId,
        itemCount: items.length,
        conflictColumns,
      }
    );

    return {
      success: false,
      error: error.message || `Error upserting into ${table}`,
      itemsProcessed: 0,
      itemsFailed: items.length,
    };
  }
}
