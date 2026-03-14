// Silent Failures Prevention - Bulk Operations Error Handling
// Task 11: Ensures no data loss in bulk operations with comprehensive error logging

import { BulkOperationResult, FailureRecord } from "../types.ts";

/**
 * Structured error logging for bulk operations
 * Prevents "silent failures" where operations fail without notification
 */
export class BulkOperationErrorHandler {
  private failures: FailureRecord[] = [];
  private successes: string[] = [];
  private operationId: string;
  private operationType: "update" | "delete" | "archive";

  constructor(operationId: string, operationType: "update" | "delete" | "archive") {
    this.operationId = operationId;
    this.operationType = operationType;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(id: string): void {
    this.successes.push(id);
  }

  /**
   * Record a failed operation with detailed error context
   * CRITICAL: Never silent - all failures must be logged
   */
  recordFailure(
    id: string,
    error: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const failureRecord: FailureRecord = {
      id,
      operationId: this.operationId,
      operationType: this.operationType,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        userAction: "bulk_operation_failure",
      },
    };

    this.failures.push(failureRecord);
    
    // Log immediately for debugging
    console.error(
      `[BULK_${this.operationType.toUpperCase()}_FAILURE] ID: ${id}`,
      failureRecord
    );
  }

  /**
   * Get summary of operation results
   */
  getSummary(): BulkOperationResult {
    const total = this.successes.length + this.failures.length;
    const successCount = this.successes.length;
    const failureCount = this.failures.length;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;

    return {
      operationId: this.operationId,
      operationType: this.operationType,
      total,
      succeeded: successCount,
      failed: failureCount,
      successRate,
      partialSuccess: successCount > 0 && failureCount > 0,
      failures: this.failures,
      failedIds: this.failures.map(f => f.id),
      successIds: this.successes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if operation had critical failures
   */
  hasCriticalFailures(): boolean {
    return this.failures.length > 0;
  }

  /**
   * Get human-readable summary for user notification
   */
  getUserMessage(): string {
    const summary = this.getSummary();
    
    if (summary.failed === 0) {
      return `✅ ${this.operationType.charAt(0).toUpperCase() + this.operationType.slice(1)}: ${summary.succeeded} of ${summary.total} successful`;
    }
    
    if (summary.partialSuccess) {
      return `⚠️ Partial success: ${summary.succeeded} of ${summary.total} completed. 
Failed items: ${summary.failedIds.join(", ")}. 
Please review and retry failed items.`;
    }
    
    return `❌ ${this.operationType.charAt(0).toUpperCase() + this.operationType.slice(1)} failed for all ${summary.total} items. 
Please check the error details and try again.`;
  }

  /**
   * Should operation be retried?
   */
  shouldRetry(): boolean {
    // Retry if there are failures but not all failures
    return this.failures.length > 0 && this.failures.length < (this.successes.length + this.failures.length);
  }

  /**
   * Get items that should be retried
   */
  getRetryableIds(): string[] {
    // Only retry transient-error items (not validation issues)
    return this.failures
      .filter(f => 
        !f.errorMessage.includes("validation") &&
        !f.errorMessage.includes("not found") &&
        !f.errorMessage.includes("unauthorized")
      )
      .map(f => f.id);
  }
}

/**
 * Middleware for wrapping bulk operations with error handling
 */
export async function executeBulkOperationWithErrorHandling<T>(
  ids: string[],
  operation: (id: string) => Promise<T>,
  operationId: string,
  operationType: "update" | "delete" | "archive"
): Promise<BulkOperationResult> {
  const errorHandler = new BulkOperationErrorHandler(operationId, operationType);

  // Process each item
  for (const id of ids) {
    try {
      await operation(id);
      errorHandler.recordSuccess(id);
    } catch (error) {
      const context = {
        itemId: id,
        operationType,
        attemptedAt: new Date().toISOString(),
      };
      
      errorHandler.recordFailure(id, error, context);
    }
  }

  const summary = errorHandler.getSummary();
  
  // Log the complete operation result
  console.log(
    `[BULK_OPERATION_SUMMARY] ${operationType}:`,
    {
      total: summary.total,
      succeeded: summary.succeeded,
      failed: summary.failed,
      successRate: `${summary.successRate.toFixed(1)}%`,
    }
  );

  return summary;
}

/**
 * Batch processing with retry mechanism
 * Prevents timeout on large bulk operations
 */
export async function executeBulkOperationInBatches<T>(
  ids: string[],
  operation: (id: string) => Promise<T>,
  operationId: string,
  operationType: "update" | "delete" | "archive",
  batchSize: number = 10,
  maxRetries: number = 3
): Promise<BulkOperationResult> {
  const errorHandler = new BulkOperationErrorHandler(operationId, operationType);
  const failedBatches = new Map<number, string[]>();

  // First pass: Process in batches
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(id => 
        operation(id).then(() => ({ id, success: true })).catch(error => ({ id, error, success: false }))
      )
    );

    batchResults.forEach((result, index) => {
      const id = batch[index];
      if (result.status === "fulfilled") {
        if (result.value.success) {
          errorHandler.recordSuccess(id);
        } else {
          errorHandler.recordFailure(id, result.value.error, { batch: Math.floor(i / batchSize) });
          if (!failedBatches.has(Math.floor(i / batchSize))) {
            failedBatches.set(Math.floor(i / batchSize), []);
          }
          failedBatches.get(Math.floor(i / batchSize))!.push(id);
        }
      } else {
        errorHandler.recordFailure(id, result.reason, { batch: Math.floor(i / batchSize) });
      }
    });

    // Add delay between batches to avoid overwhelming server
    if (i + batchSize < ids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Retry failed items (up to maxRetries)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const retryableIds = errorHandler.getRetryableIds();
    if (retryableIds.length === 0) break;

    console.log(`[BULK_OPERATION_RETRY] Attempt ${attempt}/${maxRetries}: ${retryableIds.length} items`);

    // Remove previous failure records for retry items
    errorHandler["failures"] = errorHandler["failures"].filter(
      f => !retryableIds.includes(f.id)
    );

    for (const id of retryableIds) {
      try {
        await operation(id);
        errorHandler.recordSuccess(id);
      } catch (error) {
        errorHandler.recordFailure(id, error, { 
          retryAttempt: attempt,
          batch: "retry"
        });
      }
    }

    // Exponential backoff before next retry
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }

  return errorHandler.getSummary();
}

export { BulkOperationErrorHandler };
