import React, { createContext, useContext, ReactNode } from 'react';
import { WidgetDefinition } from '@/lib/dashboard/widgets';

/**
 * Represents data for a single widget with loading and error states
 */
export interface WidgetData {
  data: any;
  isLoading: boolean;
  error?: Error | null;
}

/**
 * Shared context for all widgets to access data without prop drilling
 * Eliminates need to pass 10+ props through 3 levels of components
 */
export interface WidgetContextType {
  // Data for all widgets (keyed by widget ID)
  dataMap: Record<string, WidgetData>;
  
  // Widget definitions/catalog
  definitions: Record<string, WidgetDefinition>;
  
  // Widget management callbacks
  onWidgetRemove: (widgetId: string) => void;
  onWidgetUpdate: (widgetId: string, config: any) => void;
  
  // Drag-drop state
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

/**
 * Hook to access widget context
 * Throws if used outside WidgetProvider
 */
export function useWidgetContext(): WidgetContextType {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error(
      'useWidgetContext must be used within WidgetProvider. ' +
      'Make sure your component is wrapped with <WidgetProvider>'
    );
  }
  return context;
}

/**
 * Provider component for WidgetContext
 * Wrap DashboardBuilder with this to provide context to all child widgets
 */
export interface WidgetProviderProps extends WidgetContextType {
  children: ReactNode;
}

export function WidgetProvider({
  dataMap,
  definitions,
  onWidgetRemove,
  onWidgetUpdate,
  isDragging,
  setIsDragging,
  children,
}: WidgetProviderProps) {
  const value: WidgetContextType = {
    dataMap,
    definitions,
    onWidgetRemove,
    onWidgetUpdate,
    isDragging,
    setIsDragging,
  };

  return (
    <WidgetContext.Provider value={value}>
      {children}
    </WidgetContext.Provider>
  );
}

/**
 * Convenience hook to access specific widget data
 * @param widgetId - ID of the widget
 * @returns WidgetData for that widget or null
 */
export function useWidgetData(widgetId: string): WidgetData | null {
  const { dataMap } = useWidgetContext();
  return dataMap[widgetId] || null;
}

/**
 * Convenience hook to access specific widget definition
 * @param widgetId - ID of the widget
 * @returns WidgetDefinition for that widget or null
 */
export function useWidgetDefinition(widgetId: string): WidgetDefinition | null {
  const { definitions } = useWidgetContext();
  return definitions[widgetId] || null;
}
