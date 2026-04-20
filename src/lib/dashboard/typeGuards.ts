import { WidgetDefinition, WidgetType } from '@/lib/dashboard/widgets';
import { MonthlyComparisonData } from '@/hooks/dashboard/useMonthlyComparison';
import { ReceivablesData } from '@/hooks/dashboard/useReceivables';

/**
 * Type guards for dashboard data
 * Used to validate data before rendering to prevent runtime errors
 */

export function isMonthlyComparisonData(value: unknown): value is MonthlyComparisonData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj.currentMonth === 'number' &&
    typeof obj.lastMonth === 'number' &&
    typeof obj.percentageChange === 'number'
  );
}

export function isReceivablesData(value: unknown): value is ReceivablesData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj.total === 'number' &&
    typeof obj.overdue === 'number' &&
    typeof obj.overduePercentage === 'number'
  );
}

export function isChartData(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null);
}

export function isWidgetDefinition(value: unknown): value is WidgetDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.icon === 'function' &&
    typeof obj.color === 'string'
  );
}

export function isValidWidgetType(value: unknown): value is WidgetType {
  const validTypes: WidgetType[] = [
    'kpi-monthly-sales',
    'kpi-gross-margin',
    'kpi-receivables',
    'kpi-sales-today',
    'chart-top-products',
    'chart-top-customers',
    'chart-sales-7days',
    'list-critical-stock',
    'currency-rates',
    'currency-summary',
  ];
  return validTypes.includes(value as WidgetType);
}

/**
 * Guard for array types
 */
export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(item => guard(item));
}

/**
 * Guard for non-null values
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Guard for number values
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Guard for string values
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Guard for Error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error || (typeof value === 'object' && value !== null && 'message' in value);
}
