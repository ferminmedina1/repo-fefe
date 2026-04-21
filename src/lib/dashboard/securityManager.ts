/**
 * Dashboard Security System - Enterprise Grade
 * Valida todas las operaciones del dashboard
 */

export interface SecurityPolicy {
  maxWidgetsPerDashboard: number;
  maxDashboardsPerUser: number;
  maxDataSizePerWidget: number; // bytes
  allowedWidgetTypes: string[];
  rateLimitOperationsPerMinute: number;
  requireAuditLog: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: "create_widget" | "remove_widget" | "reorder_widget" | "update_config" | "access_dashboard";
  resourceId: string;
  resourceType: "widget" | "dashboard";
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: "critical" | "high" | "medium";
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Default Enterprise Security Policy
 */
export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  maxWidgetsPerDashboard: 50,
  maxDashboardsPerUser: 100,
  maxDataSizePerWidget: 10 * 1024 * 1024, // 10MB
  allowedWidgetTypes: [
    "kpi",
    "chart",
    "list",
    "currency",
    "metric",
    "gauge",
    "table",
    "map",
  ],
  rateLimitOperationsPerMinute: 60,
  requireAuditLog: true,
};

/**
 * Dashboard Security Manager
 */
export class DashboardSecurityManager {
  private policy: SecurityPolicy;
  private auditLog: AuditLogEntry[] = [];
  private operationTimestamps: Map<string, Date[]> = new Map();

  constructor(policy: Partial<SecurityPolicy> = {}) {
    this.policy = { ...DEFAULT_SECURITY_POLICY, ...policy };
  }

  /**
   * Validar datos de widget
   */
  validateWidgetData(data: any, maxSize?: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const dataSize = JSON.stringify(data).length;
      const maxDataSize = maxSize || this.policy.maxDataSizePerWidget;

      if (dataSize > maxDataSize) {
        errors.push({
          code: "DATA_TOO_LARGE",
          message: `Datos del widget exceden el límite de ${maxDataSize / 1024 / 1024}MB`,
          severity: "high",
          field: "data",
        });
      }

      if (dataSize > maxDataSize * 0.8) {
        warnings.push({
          code: "DATA_LARGE",
          message: `Datos del widget están cerca del límite`,
          suggestion: "Considera paginar o filtrar los datos",
        });
      }

      // Check for suspicious patterns
      if (typeof data === "object" && data !== null) {
        if (JSON.stringify(data).includes("<script")) {
          errors.push({
            code: "SUSPICIOUS_CONTENT",
            message: "Contenido sospechoso detectado en datos",
            severity: "critical",
          });
        }
      }
    } catch (error) {
      errors.push({
        code: "INVALID_DATA",
        message: "Datos inválidos o no serializables",
        severity: "critical",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validar tipo de widget
   */
  validateWidgetType(type: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!this.policy.allowedWidgetTypes.includes(type)) {
      errors.push({
        code: "INVALID_WIDGET_TYPE",
        message: `Tipo de widget no permitido: ${type}`,
        severity: "high",
        field: "type",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validar límite de widgets
   */
  validateWidgetCount(currentCount: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (currentCount >= this.policy.maxWidgetsPerDashboard) {
      errors.push({
        code: "MAX_WIDGETS_EXCEEDED",
        message: `Se alcanzó el máximo de ${this.policy.maxWidgetsPerDashboard} widgets`,
        severity: "high",
      });
    }

    if (currentCount > this.policy.maxWidgetsPerDashboard * 0.8) {
      warnings.push({
        code: "WIDGET_LIMIT_WARNING",
        message: `Estás usando el ${Math.round((currentCount / this.policy.maxWidgetsPerDashboard) * 100)}% del límite de widgets`,
        suggestion: "Considera optimizar o eliminar widgets innecesarios",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validar límite de dashboards
   */
  validateDashboardCount(currentCount: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (currentCount >= this.policy.maxDashboardsPerUser) {
      errors.push({
        code: "MAX_DASHBOARDS_EXCEEDED",
        message: `Se alcanzó el máximo de ${this.policy.maxDashboardsPerUser} dashboards`,
        severity: "high",
      });
    }

    if (currentCount > this.policy.maxDashboardsPerUser * 0.8) {
      warnings.push({
        code: "DASHBOARD_LIMIT_WARNING",
        message: `Estás usando el ${Math.round((currentCount / this.policy.maxDashboardsPerUser) * 100)}% del límite de dashboards`,
        suggestion: "Considera archivar o eliminar dashboards antiguos",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(userId: string): ValidationResult {
    const errors: ValidationError[] = [];
    const now = new Date();

    // Get operations in the last minute
    const operations = this.operationTimestamps.get(userId) || [];
    const recentOperations = operations.filter(
      (timestamp) => now.getTime() - timestamp.getTime() < 60000
    );

    if (recentOperations.length >= this.policy.rateLimitOperationsPerMinute) {
      errors.push({
        code: "RATE_LIMIT_EXCEEDED",
        message: `Límite de ${this.policy.rateLimitOperationsPerMinute} operaciones por minuto excedido`,
        severity: "high",
      });
    }

    // Update timestamps
    this.operationTimestamps.set(userId, [...recentOperations, now]);

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Log audit entry
   */
  logAudit(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    if (!this.policy.requireAuditLog) return {} as AuditLogEntry;

    const auditEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.auditLog.push(auditEntry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Audit]", auditEntry);
    }

    return auditEntry;
  }

  /**
   * Get audit log
   */
  getAuditLog(userId?: string, limit: number = 100): AuditLogEntry[] {
    let log = this.auditLog;

    if (userId) {
      log = log.filter((entry) => entry.userId === userId);
    }

    return log.slice(-limit);
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): string {
    const report = `
# Security Report - ${new Date().toISOString()}

## Policy
- Max Widgets per Dashboard: ${this.policy.maxWidgetsPerDashboard}
- Max Dashboards per User: ${this.policy.maxDashboardsPerUser}
- Max Data Size per Widget: ${this.policy.maxDataSizePerWidget / 1024 / 1024}MB
- Rate Limit: ${this.policy.rateLimitOperationsPerMinute} ops/min
- Audit Logging: ${this.policy.requireAuditLog ? "Enabled" : "Disabled"}

## Audit Log Summary
- Total Entries: ${this.auditLog.length}
- Last 24 Hours: ${this.auditLog.filter((e) => Date.now() - e.timestamp.getTime() < 86400000).length}
- Failed Operations: ${this.auditLog.filter((e) => !e.success).length}

## Recent Activity
${this.auditLog
  .slice(-10)
  .reverse()
  .map(
    (e) =>
      `- ${e.timestamp.toISOString()} [${e.action}] ${e.resourceType}/${e.resourceId} by ${e.userId} ${
        e.success ? "✓" : `✗ ${e.errorMessage}`
      }`
  )
  .join("\n")}
    `;

    return report;
  }
}
