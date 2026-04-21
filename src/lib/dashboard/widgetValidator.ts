/**
 * Widget Validator - Sistema de validación automática para widgets
 * Detecta problemas comunes: datos faltantes, errores, rendering lento, etc.
 */

export interface WidgetHealthStatus {
  id: string;
  healthy: boolean;
  issues: WidgetIssue[];
  performance: {
    loadTime: number; // ms
    renderTime: number; // ms
    dataSize: number; // bytes
  };
  lastCheck: Date;
}

export interface WidgetIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
}

export class WidgetValidator {
  /**
   * Valida el estado de un widget
   */
  static validateWidget(
    widgetId: string,
    data: any,
    isLoading: boolean,
    error: Error | null | undefined,
    renderTime: number,
    loadTime: number
  ): WidgetHealthStatus {
    const issues: WidgetIssue[] = [];

    // Cheque 1: Errores
    if (error) {
      issues.push({
        type: 'error',
        code: 'WIDGET_ERROR',
        message: `Widget en error: ${error.message}`,
        suggestion: 'Revisa la consola del navegador para más detalles',
      });
    }

    // Cheque 2: Datos vacíos
    if (!isLoading && !error && (!data || (Array.isArray(data) && data.length === 0))) {
      issues.push({
        type: 'warning',
        code: 'EMPTY_DATA',
        message: 'El widget no tiene datos para mostrar',
        suggestion: 'Verifica que los filtros estén configurados correctamente',
      });
    }

    // Cheque 3: Carga lenta
    if (loadTime > 5000) {
      issues.push({
        type: 'warning',
        code: 'SLOW_LOAD',
        message: `Widget tarda ${(loadTime / 1000).toFixed(1)}s en cargar`,
        suggestion: 'Considera optimizar la query o añadir paginación',
      });
    }

    // Cheque 4: Renderizado lento
    if (renderTime > 1000) {
      issues.push({
        type: 'info',
        code: 'SLOW_RENDER',
        message: `Renderizado tarda ${(renderTime).toFixed(0)}ms`,
        suggestion: 'Considera usar React.memo o useMemo para optimizar',
      });
    }

    // Cheque 5: Datos muy grandes
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 5 * 1024 * 1024) {
      // 5MB
      issues.push({
        type: 'warning',
        code: 'LARGE_DATA',
        message: `Widget tiene ${(dataSize / 1024 / 1024).toFixed(1)}MB de datos`,
        suggestion: 'Considera paginar o filtrar los datos',
      });
    }

    return {
      id: widgetId,
      healthy: issues.length === 0 || issues.every((i) => i.type === 'info'),
      issues,
      performance: {
        loadTime,
        renderTime,
        dataSize,
      },
      lastCheck: new Date(),
    };
  }

  /**
   * Calcula salud general de múltiples widgets
   */
  static calculateDashboardHealth(statuses: WidgetHealthStatus[]) {
    const total = statuses.length;
    const healthy = statuses.filter((s) => s.healthy).length;
    const errors = statuses.flatMap((s) => s.issues.filter((i) => i.type === 'error')).length;
    const warnings = statuses.flatMap((s) => s.issues.filter((i) => i.type === 'warning')).length;

    const avgLoadTime = statuses.reduce((sum, s) => sum + s.performance.loadTime, 0) / total || 0;
    const avgRenderTime = statuses.reduce((sum, s) => sum + s.performance.renderTime, 0) / total || 0;
    const totalDataSize = statuses.reduce((sum, s) => sum + s.performance.dataSize, 0);

    return {
      healthPercentage: (healthy / total) * 100,
      healthy: errors === 0,
      total,
      healthy: healthy,
      errors,
      warnings,
      performance: {
        avgLoadTime,
        avgRenderTime,
        totalDataSize,
      },
      status: errors > 0 ? 'critical' : warnings > 0 ? 'warning' : 'healthy',
    };
  }

  /**
   * Genera un reporte de diagnóstico
   */
  static generateDiagnosticReport(statuses: WidgetHealthStatus[]): string {
    const health = this.calculateDashboardHealth(statuses);

    let report = `# Dashboard Diagnostic Report\n\n`;
    report += `**Status**: ${health.status.toUpperCase()}\n`;
    report += `**Health**: ${health.healthPercentage.toFixed(1)}% (${health.healthy}/${health.total})\n`;
    report += `**Errors**: ${health.errors} | **Warnings**: ${health.warnings}\n\n`;

    report += `## Performance\n`;
    report += `- Avg Load Time: ${health.performance.avgLoadTime.toFixed(0)}ms\n`;
    report += `- Avg Render Time: ${health.performance.avgRenderTime.toFixed(0)}ms\n`;
    report += `- Total Data Size: ${(health.performance.totalDataSize / 1024).toFixed(1)}KB\n\n`;

    report += `## Widget Details\n`;
    statuses.forEach((status) => {
      report += `\n### ${status.id}\n`;
      report += `- Status: ${status.healthy ? '✅ Healthy' : '❌ Issues'}\n`;
      if (status.issues.length > 0) {
        report += `- Issues:\n`;
        status.issues.forEach((issue) => {
          report += `  - [${issue.type.toUpperCase()}] ${issue.message}\n`;
          if (issue.suggestion) {
            report += `    💡 ${issue.suggestion}\n`;
          }
        });
      }
      report += `- Load Time: ${status.performance.loadTime}ms\n`;
      report += `- Render Time: ${status.performance.renderTime}ms\n`;
    });

    return report;
  }
}
