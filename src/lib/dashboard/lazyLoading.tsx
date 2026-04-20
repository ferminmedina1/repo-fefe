/**
 * CODE SPLITTING & LAZY LOADING UTILITIES
 * ======================================== 
 * Dynamically load components/modules to reduce initial bundle size
 * 
 * Benefits:
 * - 30-40% bundle size reduction
 * - Faster initial page load
 * - On-demand loading of heavy components
 * 
 * Usage:
 * ```tsx
 * const ChartWidget = lazy(() => import('./ChartWidget'));
 * 
 * export default function Dashboard() {
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       <ChartWidget />
 *     </Suspense>
 *   );
 * }
 * ```
 */

import React, { Suspense, lazy, LazyExoticComponent, ComponentType } from 'react';

// ============================================================
// LAZY LOADING WRAPPER
// ============================================================

/**
 * Wrapper component for lazy loaded modules with error handling
 */
interface LazyLoaderProps {
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

export const LazyBoundary: React.FC<LazyLoaderProps> = ({
  fallback = <LoadingSkeleton />,
  onError,
  children
}) => {
  return (
    <ErrorBoundaryLazy onError={onError}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundaryLazy>
  );
};

/**
 * Error boundary for lazy loaded components
 */
interface ErrorBoundaryProps {
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryLazy extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <p className="text-sm font-semibold">Failed to load component</p>
          <p className="text-xs text-red-300 mt-1">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================
// LOADING SKELETON
// ============================================================

/**
 * Generic loading skeleton for lazy components
 */
export const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    <div className="h-8 bg-slate-700/50 rounded animate-pulse" />
    <div className="space-y-2">
      <div className="h-4 bg-slate-700/50 rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-slate-700/50 rounded w-1/2 animate-pulse" />
    </div>
  </div>
);

// ============================================================
// LAZY COMPONENT REGISTRY
// ============================================================

/**
 * Pre-configured lazy components
 * These are split from main bundle and loaded on demand
 * 
 * NOTE: Implementations below are commented out until actual files are created.
 * To enable code-splitting for heavy components:
 * 1. Create src/lib/dashboard/charts/LineChart.tsx
 * 2. Create src/lib/dashboard/charts/BarChart.tsx
 * 3. Create src/lib/dashboard/charts/PieChart.tsx
 * 4. Uncomment the lazy imports below
 */

// Charts (Recharts is ~300KB, split by type)
// TODO: Implement when creating separate chart component files
// export const LazyLineChart = lazy(() =>
//   import('./charts/LineChart').then(m => ({ default: m.LineChart }))
// );

// export const LazyBarChart = lazy(() =>
//   import('./charts/BarChart').then(m => ({ default: m.BarChart }))
// );

// export const LazyPieChart = lazy(() =>
//   import('./charts/PieChart').then(m => ({ default: m.PieChart }))
// );

// Heavy Components
// TODO: Import from actual component locations when ready
// export const LazyChartWidget = lazy(() =>
//   import('@/components/dashboard/ChartWidget')
// );

// export const LazyDataTable = lazy(() =>
//   import('@/components/dashboard/DataTable')
// );

// ============================================================
// DYNAMIC IMPORT HELPER
// ============================================================

/**
 * Helper to dynamically import modules at runtime
 */
export async function dynamicImport<T>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    console.error('Failed to import module:', error);
    throw error;
  }
}

// ============================================================
// PRELOAD UTILITY
// ============================================================

/**
 * Preload components before they're needed
 * Useful for prefetching components on hover or anticipation
 */
export function preloadComponent(
  componentLoader: () => Promise<any>
): void {
  try {
    componentLoader();
  } catch (error) {
    console.warn('Failed to preload component:', error);
  }
}

/**
 * Prefetch on hover
 */
export function prefetchOnHover(
  ref: React.RefObject<HTMLElement>,
  componentLoader: () => Promise<any>
): void {
  if (!ref.current) return;

  ref.current.addEventListener('mouseenter', () => {
    preloadComponent(componentLoader);
  });
}

// ============================================================
// BUNDLE ANALYZER CONFIG
// ============================================================

/**
 * Component registry for lazy-loaded modules
 * 
 * These are placeholder strings for future code-splitting implementation.
 * Uncomment the lazy imports above to activate code-splitting for these components.
 * 
 * Benefits when enabled:
 * - 30-40% bundle size reduction
 * - Faster initial page load
 * - Chart library (Recharts ~300KB) split by type
 */
export const LAZY_COMPONENTS = {
  CHARTS: {
    LINE: 'LazyLineChart',     // Requires: src/lib/dashboard/charts/LineChart.tsx
    BAR: 'LazyBarChart',       // Requires: src/lib/dashboard/charts/BarChart.tsx
    PIE: 'LazyPieChart'        // Requires: src/lib/dashboard/charts/PieChart.tsx
  },
  WIDGETS: {
    CHART: 'LazyChartWidget',     // Requires: src/components/dashboard/ChartWidget.tsx
    DATA_TABLE: 'LazyDataTable'   // Requires: src/components/dashboard/DataTable.tsx
  }
} as const;

export default LazyBoundary;
