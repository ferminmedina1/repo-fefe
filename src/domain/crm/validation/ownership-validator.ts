// Task 15 - Ownership Validation: Always check company_id
// Prevents cross-tenant data access and modifications

import { OwnershipVerificationResult } from "../types/bulk-operations.ts";

/**
 * Ownership verification for multi-tenant security
 * CRITICAL: Must be checked on EVERY operation
 * - GET: Verify user can READ this resource
 * - UPDATE: Verify user can MODIFY this resource
 * - DELETE: Verify user can DELETE this resource
 */
export class OwnershipValidator {
  /**
   * Verify user owns or has access to resource
   */
  static verifyOwnership(
    resourceCompanyId: string,
    userCompanyId: string,
    resourceId?: string
  ): OwnershipVerificationResult {
    const authorized = resourceCompanyId === userCompanyId;

    return {
      authorized,
      resourceId,
      ownerCompanyId: resourceCompanyId,
      userCompanyId,
      reason: authorized
        ? undefined
        : `Resource belongs to ${resourceCompanyId}, user belongs to ${userCompanyId}`,
    };
  }

  /**
   * Verify batch operation ownership
   */
  static verifyBatchOwnership(
    resourceIds: Array<{ id: string; company_id: string }>,
    userCompanyId: string
  ): {
    authorized: boolean;
    authorizedIds: string[];
    unauthorizedIds: string[];
    totalChecked: number;
  } {
    const authorizedIds: string[] = [];
    const unauthorizedIds: string[] = [];

    for (const resource of resourceIds) {
      if (resource.company_id === userCompanyId) {
        authorizedIds.push(resource.id);
      } else {
        unauthorizedIds.push(resource.id);
      }
    }

    return {
      authorized: unauthorizedIds.length === 0,
      authorizedIds,
      unauthorizedIds,
      totalChecked: resourceIds.length,
    };
  }

  /**
   * Create ownership middleware for database queries
   * Always add: .eq("company_id", userCompanyId)
   */
  static createOwnershipFilter(userCompanyId: string) {
    return {
      select: (query: any) => query.eq("company_id", userCompanyId),
      where: (query: any) => query.eq("company_id", userCompanyId),
      update: (query: any) => query.eq("company_id", userCompanyId),
      delete: (query: any) => query.eq("company_id", userCompanyId),
    };
  }

  /**
   * Verify field-level ownership (e.g., who created this record)
   */
  static verifyFieldOwnership(
    record: Record<string, any>,
    userIdField: string,
    userId: string,
    allowAdmins: boolean = false
  ): boolean {
    const recordUserId = record[userIdField];

    if (allowAdmins && record.is_admin) {
      return true;
    }

    return recordUserId === userId;
  }

  /**
   * Check if user has permission level
   */
  static hasPermissionLevel(
    userRole: string,
    requiredRole: "admin" | "manager" | "user"
  ): boolean {
    const roleHierarchy = {
      admin: 3,
      manager: 2,
      user: 1,
    };

    return (roleHierarchy[userRole as keyof typeof roleHierarchy] || 0) >= 
           roleHierarchy[requiredRole];
  }

  /**
   * Verify cross-company operation permissions
   */
  static verifyCrossCompanyOperation(
    userCompanyId: string,
    targetCompanyId: string,
    userRole: string
  ): OwnershipVerificationResult {
    // Only admins can access other companies
    const isAdmin = userRole === "admin";
    const sameCompany = userCompanyId === targetCompanyId;
    const authorized = sameCompany || isAdmin;

    return {
      authorized,
      userCompanyId,
      ownerCompanyId: targetCompanyId,
      reason: !authorized
        ? `User belongs to ${userCompanyId}, cannot access ${targetCompanyId}`
        : undefined,
    };
  }
}

/**
 * TypeScript utility to ensure company_id is always included in queries
 */
export interface TenantAwareQuery {
  companyId: string;
  [key: string]: any;
}

/**
 * Decorator/wrapper for tenant-aware database operations
 */
export function withTenantContext(userCompanyId: string) {
  return {
    /**
     * Ensure all SELECT queries are filtered by company
     */
    select: async <T>(
      query: (companyId: string) => Promise<T>,
      resourceId?: string
    ): Promise<T | null> => {
      try {
        const result = await query(userCompanyId);
        
        // Verify result belongs to user's company
        if (result && typeof result === "object" && "company_id" in result) {
          const verification = OwnershipValidator.verifyOwnership(
            (result as any).company_id,
            userCompanyId,
            resourceId
          );
          
          if (!verification.authorized) {
            console.warn(`[UNAUTHORIZED] Access attempt to resource outside company:`, verification);
            return null;
          }
        }
        
        return result;
      } catch (error) {
        console.error(`[TENANT_ERROR] Query failed:`, error);
        return null;
      }
    },

    /**
     * Ensure all UPDATE queries verify ownership first
     */
    update: async <T>(
      resourceId: string,
      resourceCompanyId: string,
      updateFn: (id: string) => Promise<T>
    ): Promise<T | null> => {
      const verification = OwnershipValidator.verifyOwnership(
        resourceCompanyId,
        userCompanyId,
        resourceId
      );

      if (!verification.authorized) {
        console.warn(`[UNAUTHORIZED] Update attempt on unauthorized resource:`, verification);
        return null;
      }

      return updateFn(resourceId);
    },

    /**
     * Ensure all DELETE queries verify ownership first
     */
    delete: async (
      resourceId: string,
      resourceCompanyId: string,
      deleteFn: (id: string) => Promise<boolean>
    ): Promise<boolean> => {
      const verification = OwnershipValidator.verifyOwnership(
        resourceCompanyId,
        userCompanyId,
        resourceId
      );

      if (!verification.authorized) {
        console.warn(`[UNAUTHORIZED] Delete attempt on unauthorized resource:`, verification);
        return false;
      }

      return deleteFn(resourceId);
    },
  };
}

/**
 * Hook for React components
 */
export function useOwnershipValidation(userCompanyId: string) {
  return {
    verify: (resourceCompanyId: string, resourceId?: string) =>
      OwnershipValidator.verifyOwnership(resourceCompanyId, userCompanyId, resourceId),
    verifyBatch: (resources: Array<{ id: string; company_id: string }>) =>
      OwnershipValidator.verifyBatchOwnership(resources, userCompanyId),
    createFilter: () => OwnershipValidator.createOwnershipFilter(userCompanyId),
    withTenant: () => withTenantContext(userCompanyId),
  };
}

/**
 * Audit logging for ownership verification failures
 */
export function logOwnershipViolation(
  userId: string,
  userCompanyId: string,
  attemptedResourceId: string,
  actualCompanyId: string,
  operation: "read" | "update" | "delete"
): void {
  console.error(`[SECURITY_VIOLATION] Ownership check failed:`, {
    userId,
    userCompanyId,
    attemptedResourceId,
    actualCompanyId,
    operation,
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
  });

  // In production, send to security monitoring system
  // e.g., Sentry, DataDog, CloudWatch, etc.
}
