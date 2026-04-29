import { useState, useMemo } from "react";
import { useWidgetContext } from "@/contexts/WidgetContext";
import { WidgetDefinition, WidgetData } from "@/lib/dashboard/widgets";

/**
 * ✅ CONSOLIDATED WIDGET STATE HOOK
 * Consolidates common widget state initialization logic
 * 
 * PROBLEM: Every widget (CurrencyWidget, ChartWidget, ListWidget, KpiWidget, CustomMetricWidget)
 * duplicates the same 8 lines of code for state management
 * 
 * SOLUTION: Single hook that handles:
 * - showConfig modal state
 * - widgetConfig state
 * - Data retrieval from context
 * - Loading & error handling
 * - Remove callback
 * - Drag state
 */

export interface WidgetConfig {
  refreshInterval?: number;
  showTitle?: boolean;
  showDescription?: boolean;
  enableCache?: boolean;
  [key: string]: any;
}

export interface UseWidgetStateResult {
  // Config state
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  widgetConfig: WidgetConfig;
  setWidgetConfig: (config: WidgetConfig) => void;
  
  // Data from context
  data: any;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  onRemove: () => void;
  onUpdateConfig: (newConfig: WidgetConfig) => void;
  
  // UI states
  isDragging: boolean;
}

/**
 * Hook that manages all common widget state
 * @param definition - Widget definition from catalog
 * @returns All state needed for widget rendering
 */
export function useWidgetState(definition: WidgetDefinition, widgetId: string): UseWidgetStateResult {
  // ✅ State: Config modal visibility
  const [showConfig, setShowConfig] = useState(false);

  // ✅ State: Widget configuration
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    refreshInterval: 30,
    showTitle: true,
    showDescription: true,
    enableCache: true,
  });

  // ✅ Get context
  const context = useWidgetContext();

  // ✅ Get data for this widget from context
  const widgetData = useMemo(
    () => context.dataMap[definition.id],
    [context.dataMap, definition.id]
  );

  const data = widgetData?.data ?? null;
  const isLoading = widgetData?.isLoading ?? false;
  const error = (widgetData?.error ?? null) as Error | null;

  // ✅ Action: Remove this widget
  const onRemove = () => context.onWidgetRemove(widgetId);

  // ✅ Action: Update widget config
  const onUpdateConfig = (newConfig: WidgetConfig) => {
    setWidgetConfig(newConfig);
    context.onWidgetUpdate(widgetId, newConfig);
  };

  // ✅ UI state: Is dragging
  const isDragging = context.isDragging;

  return {
    // Config state
    showConfig,
    setShowConfig,
    widgetConfig,
    setWidgetConfig,
    
    // Data
    data,
    isLoading,
    error,
    
    // Actions
    onRemove,
    onUpdateConfig,
    
    // UI
    isDragging,
  };
}

/**
 * Default loading skeleton for widgets
 * Consolidated from 5 different implementations
 */
export function WidgetLoadingSkeleton({ height = "h-48" }: { height?: string }) {
  return <div className={`${height} bg-muted animate-pulse rounded`} />;
}

/**
 * Default empty state for widgets
 * Consolidated from 5 different implementations
 */
export function WidgetEmptyState({ message = "No hay datos disponibles" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-48">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

/**
 * Default error state for widgets
 * Consolidated from 5 different implementations
 */
export function WidgetErrorState({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-4">
      <p className="text-destructive text-sm">Error al cargar widget</p>
      {error && <p className="text-xs text-muted-foreground">{error.message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1 rounded hover:bg-destructive/10"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
