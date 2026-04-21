/**
 * Enterprise Components & Utilities - Complete Export Index
 */

// Error Boundary
export { ErrorBoundary, type ErrorBoundaryProps, type ErrorBoundaryState } from "@/components/enterprise/ErrorBoundary";

// Enterprise Components
export {
  EnterpriseConfirmDialog,
  EnterpriseInfoDialog,
  LoadingSpinner,
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  type EnterpriseConfirmDialogProps,
  type EnterpriseInfoDialogProps,
} from "@/components/enterprise/EnterpriseComponents";

// Configuration
export {
  getConfigManager,
  useConfig,
  useConfigSection,
  DEFAULT_CONFIG,
  type DashboardConfig,
} from "@/lib/dashboard/enterpriseConfig";

// Error Handling
export {
  getErrorHandler,
  useErrorHandler,
  EnterpriseErrorHandler,
  type ErrorRecoveryStrategy,
  type ErrorHandler,
} from "@/lib/dashboard/errorHandling";

// All Previous Enterprise Systems
export * from "@/lib/dashboard/enterpriseIndex";
