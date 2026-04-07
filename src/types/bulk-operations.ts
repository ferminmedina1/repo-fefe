// Type definitions for bulk operation error handling and validation
// Task 11, 12, 13-18

/**
 * Result of a bulk operation with failure tracking
 */
export interface BulkOperationResult {
  operationId: string;
  operationType: "update" | "delete" | "archive";
  total: number;
  succeeded: number;
  failed: number;
  successRate: number;
  partialSuccess: boolean;
  failures: FailureRecord[];
  failedIds: string[];
  successIds: string[];
  timestamp: string;
}

/**
 * Individual failure record in a bulk operation
 */
export interface FailureRecord {
  id: string;
  operationId: string;
  operationType: "update" | "delete" | "archive";
  errorMessage: string;
  errorStack?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Validation error with field mapping
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  rule?: string;
}

/**
 * Input validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

/**
 * Storage item with metadata for sessionStorage security
 */
export interface SecureStorageItem<T> {
  data: T;
  encryptedAt: string;
  expiresAt?: string;
  hash?: string;
}

/**
 * Unsaved changes tracking
 */
export interface UnsavedChanges {
  key: string;
  changes: Record<string, unknown>;
  timestamps: {
    createdAt: string;
    lastModifiedAt: string;
  };
  isDirty: boolean;
}

/**
 * Numeric field constraints
 */
export interface NumericConstraint {
  field: string;
  min?: number;
  max?: number;
  precision?: number;
  allowNegative?: boolean;
  allowZero?: boolean;
}

/**
 * Date validation result
 */
export interface DateValidationResult {
  valid: boolean;
  normalizedDate?: Date;
  error?: string;
}

/**
 * Search query constraints
 */
export interface SearchConstraints {
  maxLength: number;
  minLength: number;
  allowedChars?: RegExp;
  forbiddenPatterns?: RegExp[];
}

/**
 * Ownership verification result
 */
export interface OwnershipVerificationResult {
  authorized: boolean;
  resourceId?: string;
  ownerCompanyId?: string;
  userCompanyId?: string;
  reason?: string;
}
