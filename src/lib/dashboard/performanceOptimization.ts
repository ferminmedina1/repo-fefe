/**
 * Dashboard Performance Optimization - Enterprise Grade
 * - Virtualization
 * - Memoization
 * - Lazy loading
 * - Code splitting
 */

import { useMemo, useCallback, useRef, useEffect, useState } from "react";

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  renderTime: number; // ms
  memoryUsed: number; // bytes
  widgetCount: number;
  dataSize: number; // bytes
  fps: number;
}

/**
 * Hook para medir performance
 */
export function useDashboardPerformance(enabled: boolean = process.env.NODE_ENV === "development") {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsed: 0,
    widgetCount: 0,
    dataSize: 0,
    fps: 0,
  });

  const renderStartRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const measurePerformance = () => {
      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;
      const fps = Math.round(1000 / delta);

      frameCountRef.current++;

      if (frameCountRef.current % 60 === 0) {
        const memoryUsed = (performance as any).memory?.usedJSHeapSize || 0;
        const renderTime = Date.now() - renderStartRef.current;

        setMetrics((prev) => ({
          ...prev,
          renderTime,
          memoryUsed,
          fps,
        }));
      }

      lastFrameTimeRef.current = now;
      requestAnimationFrame(measurePerformance);
    };

    const frameId = requestAnimationFrame(measurePerformance);
    return () => cancelAnimationFrame(frameId);
  }, [enabled]);

  return metrics;
}

/**
 * Hook para memoizar widgets con opciones avanzadas
 */
interface MemoOptions {
  deep?: boolean;
  maxSize?: number;
}

export function useMemoizedWidgets<T extends { id: string }>(
  widgets: T[],
  options: MemoOptions = {}
) {
  const { deep = false, maxSize = 50 } = options;

  return useMemo(() => {
    // Limitar número de widgets
    if (widgets.length > maxSize) {
      console.warn(`Widget limit exceeded: ${widgets.length} > ${maxSize}`);
      return widgets.slice(0, maxSize);
    }

    // Deep comparison if needed
    if (deep) {
      return widgets.map((w) => ({
        ...w,
        _hash: generateHash(w),
      }));
    }

    return widgets;
  }, [widgets, deep, maxSize]);
}

/**
 * Hook para virtualización de listas largas
 */
interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualizedList(
  items: any[],
  options: VirtualizationOptions
) {
  const { itemHeight, containerHeight, overscan = 3 } = options;

  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      virtualIndex: startIndex + index,
      offsetY: (startIndex + index) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  return {
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollTop(target.scrollTop);
    },
  };
}

/**
 * Hook para debounce de operaciones
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback;
}

/**
 * Hook para throttle de operaciones
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
) {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(
    (...args: any[]) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );

  return throttledCallback;
}

/**
 * Hook para lazy loading de componentes
 */
export function useLazyLoad(threshold: number = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/**
 * Hook para monitoreo de memory leaks
 */
export function useMemoryMonitor(name: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const memory = (performance as any).memory;
    if (!memory) return;

    const initialMemory = memory.usedJSHeapSize;

    return () => {
      const finalMemory = memory.usedJSHeapSize;
      const delta = finalMemory - initialMemory;

      if (delta > 1024 * 1024) {
        // > 1MB
        console.warn(`[Memory] ${name} increased by ${(delta / 1024 / 1024).toFixed(2)}MB`);
      }
    };
  }, [name]);
}

/**
 * Generar hash para comparaciones
 */
function generateHash(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

/**
 * Performance Report Generator
 */
export function generatePerformanceReport(metrics: PerformanceMetrics): string {
  return `
# Performance Report - ${new Date().toISOString()}

## Metrics
- Render Time: ${metrics.renderTime}ms
- Memory Used: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB
- Widget Count: ${metrics.widgetCount}
- Data Size: ${(metrics.dataSize / 1024).toFixed(2)}KB
- FPS: ${metrics.fps}

## Recommendations
${metrics.renderTime > 100 ? "⚠️ Render time is high. Consider optimizing components." : "✓ Render time is good."}
${metrics.memoryUsed > 100 * 1024 * 1024 ? "⚠️ Memory usage is high. Check for memory leaks." : "✓ Memory usage is acceptable."}
${metrics.fps < 60 ? "⚠️ FPS is low. Consider reducing animations or widget count." : "✓ FPS is good."}
${metrics.widgetCount > 30 ? "⚠️ Too many widgets. Consider pagination or filtering." : "✓ Widget count is reasonable."}
  `;
}
