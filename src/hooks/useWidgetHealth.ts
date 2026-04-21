/**
 * Hook para monitorear la salud de los widgets
 * Usa WidgetValidator internamente y proporciona estado reactivo
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { WidgetValidator, WidgetHealthStatus } from '@/lib/dashboard/widgetValidator';

export interface UseWidgetHealthOptions {
  enableLogging?: boolean;
  checkInterval?: number; // ms
  onHealthChange?: (health: WidgetHealthStatus) => void;
}

export function useWidgetHealth(
  widgetId: string,
  data: any,
  isLoading: boolean,
  error: Error | null | undefined,
  options: UseWidgetHealthOptions = {}
) {
  const { enableLogging = false, checkInterval = 5000, onHealthChange } = options;

  const [health, setHealth] = useState<WidgetHealthStatus | null>(null);
  const renderTimeRef = useRef<number>(0);
  const loadTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);

  // Medir tiempo de renderizado
  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  // Chequear salud después del render
  useEffect(() => {
    const now = performance.now();
    renderTimeRef.current = now - renderStartRef.current;

    // Ejecutar validación
    const healthStatus = WidgetValidator.validateWidget(
      widgetId,
      data,
      isLoading,
      error,
      renderTimeRef.current,
      loadTimeRef.current
    );

    setHealth(healthStatus);

    if (enableLogging && healthStatus.issues.length > 0) {
      console.warn(`[Widget Health] ${widgetId}:`, healthStatus.issues);
    }

    if (onHealthChange) {
      onHealthChange(healthStatus);
    }

    // Rastrear load time
    if (isLoading) {
      loadTimeRef.current = 0;
    } else {
      loadTimeRef.current = now - renderStartRef.current;
    }
  }, [data, isLoading, error, widgetId, enableLogging, onHealthChange]);

  const getStatusColor = useCallback((): 'green' | 'yellow' | 'red' => {
    if (!health) return 'green';
    if (health.issues.some((i) => i.type === 'error')) return 'red';
    if (health.issues.some((i) => i.type === 'warning')) return 'yellow';
    return 'green';
  }, [health]);

  const getSummary = useCallback((): string => {
    if (!health) return 'Monitoring...';
    if (health.healthy) return '✅ Healthy';
    const errors = health.issues.filter((i) => i.type === 'error').length;
    const warnings = health.issues.filter((i) => i.type === 'warning').length;
    if (errors > 0) return `❌ ${errors} error(s)`;
    if (warnings > 0) return `⚠️ ${warnings} warning(s)`;
    return '✅ Healthy';
  }, [health]);

  return {
    health,
    statusColor: getStatusColor(),
    summary: getSummary(),
    isHealthy: health?.healthy ?? true,
  };
}

/**
 * Hook para monitorear la salud de todos los widgets en un dashboard
 */
export function useDashboardHealth(
  widgetStatuses: Record<string, WidgetHealthStatus>,
  options: UseWidgetHealthOptions = {}
) {
  const { enableLogging = false } = options;
  const [dashboardHealth, setDashboardHealth] = useState<ReturnType<
    typeof WidgetValidator.calculateDashboardHealth
  > | null>(null);

  useEffect(() => {
    const statuses = Object.values(widgetStatuses);
    if (statuses.length === 0) return;

    const health = WidgetValidator.calculateDashboardHealth(statuses);
    setDashboardHealth(health);

    if (enableLogging) {
      console.log('[Dashboard Health]', health);
    }
  }, [widgetStatuses, enableLogging]);

  return dashboardHealth;
}
