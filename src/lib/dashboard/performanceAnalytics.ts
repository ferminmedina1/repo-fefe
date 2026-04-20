/**
 * PERFORMANCE ANALYTICS & MONITORING
 * ==================================
 * Track Core Web Vitals and custom performance metrics
 * 
 * Tracks:
 * - Largest Contentful Paint (LCP)
 * - First Input Delay (FID)
 * - Cumulative Layout Shift (CLS)
 * - Custom component render times
 * - API response times
 * - User interactions
 */

// ============================================================
// CORE WEB VITALS TRACKING
// ============================================================

/**
 * Listen for Core Web Vitals using Web Vitals library
 * https://github.com/GoogleChrome/web-vitals
 */
export interface WebVital {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface PerformanceMetric {
  timestamp: number;
  component: string;
  operation: string;
  duration: number;
  metadata?: Record<string, any>;
}

// ============================================================
// ANALYTICS MANAGER
// ============================================================

class PerformanceAnalyticsManager {
  private metrics: PerformanceMetric[] = [];
  private enabled = true;

  /**
   * Record a performance metric
   */
  recordMetric(
    component: string,
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      component,
      operation,
      duration,
      metadata,
    };

    this.metrics.push(metric);

    // Send to analytics if slow
    if (duration > 1000) {
      this.trackSlow(metric);
    }
  }

  /**
   * Measure and record operation time
   */
  async measureAsync<T>(
    component: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.recordMetric(component, operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(component, operation, duration, {
        ...metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Synchronous version
   */
  measureSync<T>(
    component: string,
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      this.recordMetric(component, operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(component, operation, duration, {
        ...metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVital(vital: WebVital): void {
    if (!this.enabled) return;

    const threshold = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 600, poor: 1800 },
      INP: { good: 200, poor: 500 },
    };

    const config = threshold[vital.name];
    const isGood = vital.value <= config.good;

    console.log(`📊 ${vital.name}: ${vital.value.toFixed(0)}ms - ${vital.rating}`);

    // Send to analytics service
    this.sendToAnalytics({
      event: 'web_vital',
      metric: vital.name,
      value: vital.value,
      rating: vital.rating,
      timestamp: Date.now(),
    });
  }

  /**
   * Track slow operations
   */
  private trackSlow(metric: PerformanceMetric): void {
    console.warn(`⚠️ Slow operation detected:`, {
      component: metric.component,
      operation: metric.operation,
      duration: `${metric.duration.toFixed(0)}ms`,
    });

    this.sendToAnalytics({
      event: 'slow_operation',
      component: metric.component,
      operation: metric.operation,
      duration: metric.duration,
      timestamp: metric.timestamp,
    });
  }

  /**
   * Send metrics to analytics service (Google Analytics, Sentry, etc)
   */
  private sendToAnalytics(data: Record<string, any>): void {
    // Implementation depends on analytics provider
    // Example with Google Analytics:
    // if (window.gtag) {
    //   window.gtag('event', 'performance_metric', data);
    // }

    console.debug('📈 Sending to analytics:', data);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
  } {
    if (this.metrics.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowestOperation: null,
      };
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / this.metrics.length;
    const slowestOperation = this.metrics.reduce((slow, metric) =>
      metric.duration > (slow?.duration ?? 0) ? metric : slow
    );

    return {
      totalMetrics: this.metrics.length,
      averageDuration,
      slowestOperation,
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// ============================================================
// REACT HOOK FOR PERFORMANCE TRACKING
// ============================================================

import { useEffect, useRef } from 'react';

/**
 * Hook to track component render time
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   usePerformanceTracking('MyComponent', 'render');
 *   return <div>...</div>;
 * }
 * ```
 */
export function usePerformanceTracking(
  componentName: string,
  operationName: string = 'render'
): void {
  const renderTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderTimeRef.current;
    analyticsManager.recordMetric(componentName, operationName, renderTime);
  }, [componentName, operationName]);
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const analyticsManager = new PerformanceAnalyticsManager();

// ============================================================
// MONITORING DASHBOARD DATA
// ============================================================

/**
 * Expected metrics after optimization:
 * 
 * BEFORE Phase 5:
 * - Dashboard initial load: 2.5s
 * - Widget render: 500-800ms
 * - Chart render: 400-600ms
 * - API response: 200-500ms
 * - List with 1000 items: 800ms+
 *
 * AFTER Phase 5:
 * - Dashboard initial load: 800-1200ms (-50%)
 * - Widget render: 100-200ms (-75%)
 * - Chart render: 150-250ms (-60%)
 * - API response: 150-300ms (parallel + cache)
 * - List with 1000 items: 50-100ms (-90%)
 *
 * Core Web Vitals Target:
 * - LCP: 2.5s (Good threshold)
 * - FID: 100ms (Good threshold)
 * - CLS: 0.1 (Good threshold)
 */

export default analyticsManager;
