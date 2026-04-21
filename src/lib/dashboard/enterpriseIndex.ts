/**
 * Enterprise Dashboard System - All Exports
 * Centraliza todos los módulos enterprise-grade
 */

// Security
export {
  DashboardSecurityManager,
  DEFAULT_SECURITY_POLICY,
  type SecurityPolicy,
  type SecurityAlert,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type AuditLogEntry,
} from "@/lib/dashboard/securityManager";

// Performance
export {
  useDashboardPerformance,
  useMemoizedWidgets,
  useVirtualizedList,
  useDebouncedCallback,
  useThrottledCallback,
  useLazyLoad,
  useMemoryMonitor,
  generatePerformanceReport,
  type PerformanceMetrics,
} from "@/lib/dashboard/performanceOptimization";

// Accessibility
export {
  KeyboardNavigationManager,
  A11yAnnouncer,
  FocusManager,
  ContrastModeDetector,
  AriaHelper,
  generateA11yReport,
  type KeyboardShortcut,
  type A11yMessage,
} from "@/lib/dashboard/accessibilityManager";

// Logging
export {
  EnterpriseLogger,
  getLogger,
  LogLevel,
  type LogEntry,
  type LoggerConfig,
} from "@/lib/dashboard/enterpriseLogger";

// Enhanced Drag & Drop
export {
  EnterpriseDragDropContainer,
  EnterpriseSortableWidget,
  type SecurityAlert as DragSecurityAlert,
} from "@/components/dashboard/EnhancedDragDropContainer";

// Widget System (existing)
export {
  WidgetValidator,
  useWidgetHealth,
  useDashboardHealth,
  DashboardStats,
  type WidgetHealthStatus,
  type WidgetIssue,
} from "@/lib/dashboard/widgetSystem";

// Enterprise Hook
export { useEnterpriseDashboard, type UseEnterpriseDashboardOptions } from "@/hooks/useEnterpriseDashboard";
