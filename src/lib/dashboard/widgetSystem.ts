/**
 * Widget System Exports
 * Centraliza todas las utilidades de widgets
 */

// Validator
export { WidgetValidator, type WidgetHealthStatus, type WidgetIssue } from '@/lib/dashboard/widgetValidator';

// Hooks
export { useWidgetHealth, useDashboardHealth } from '@/hooks/useWidgetHealth';

// Components
export { DashboardStats } from '@/components/dashboard/DashboardStats';
