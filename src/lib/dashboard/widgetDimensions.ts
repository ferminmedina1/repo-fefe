/**
 * ✅ CENTRALIZED WIDGET DIMENSIONS
 * 
 * PROBLEM: Widget sizes are hardcoded throughout the codebase
 * - Classes hardcoded in components: "col-span-1", "col-span-2", "md:col-span-2", etc.
 * - Heights hardcoded: "h-48", "h-64", "h-96"
 * - Responsive rules scattered everywhere
 * 
 * Makes it impossible to:
 * - Change grid layout globally
 * - Maintain consistent sizing
 * - Support different screen layouts
 * - Theme-based dimensions
 * 
 * SOLUTION: Centralized configuration
 */

export type WidgetSize = "quarter" | "half" | "full";

interface WidgetDimensions {
  // Grid column spans for different breakpoints
  gridColSpan: string;
  
  // Min height for widget content
  minHeight: string;
  
  // Padding inside widget
  padding: string;
  
  // Border radius
  borderRadius: string;
}

/**
 * Widget dimension configurations
 * Can be extended with theming or user preferences
 */
const WIDGET_SIZE_CONFIG: Record<WidgetSize, WidgetDimensions> = {
  quarter: {
    gridColSpan: "col-span-1",
    minHeight: "h-48",
    padding: "p-3",
    borderRadius: "rounded-lg",
  },
  half: {
    gridColSpan: "col-span-1 md:col-span-2",
    minHeight: "h-64",
    padding: "p-4",
    borderRadius: "rounded-lg",
  },
  full: {
    gridColSpan: "col-span-1 md:col-span-2 lg:col-span-3",
    minHeight: "h-80",
    padding: "p-6",
    borderRadius: "rounded-lg",
  },
};

/**
 * Get dimensions for a widget size
 * @param size - Widget size (quarter | half | full)
 * @returns Dimensions object with all CSS classes
 */
export function getWidgetDimensions(size: WidgetSize): WidgetDimensions {
  return WIDGET_SIZE_CONFIG[size] || WIDGET_SIZE_CONFIG.full;
}

/**
 * Get grid column span class for a widget
 * @param size - Widget size
 * @returns CSS class string for grid positioning
 */
export function getWidgetGridClass(size: WidgetSize): string {
  return getWidgetDimensions(size).gridColSpan;
}

/**
 * Get min height class for a widget
 * @param size - Widget size
 * @returns CSS class string for height
 */
export function getWidgetHeightClass(size: WidgetSize): string {
  return getWidgetDimensions(size).minHeight;
}

/**
 * Get all classes for a widget container
 * @param size - Widget size
 * @returns Combined CSS classes
 */
export function getWidgetContainerClasses(size: WidgetSize): string {
  const dims = getWidgetDimensions(size);
  return `${dims.gridColSpan} ${dims.minHeight} ${dims.padding} ${dims.borderRadius}`;
}

/**
 * Custom dimensions for specific widget types
 * Can override default sizes per widget category
 */
const WIDGET_TYPE_OVERRIDES: Record<string, Partial<WidgetDimensions>> = {
  "currency-summary": {
    minHeight: "h-96", // Currency widgets need more space
  },
  "currency-rates": {
    minHeight: "h-96",
  },
  "chart-sales-7days": {
    minHeight: "h-72", // Charts need enough space for legend
  },
  "list-critical-stock": {
    minHeight: "h-full", // Lists can be variable height
  },
};

/**
 * Get dimensions for a specific widget, with type-specific overrides
 * @param size - Widget size
 * @param widgetType - Widget type ID (e.g., "currency-summary")
 * @returns Dimensions with any type-specific overrides applied
 */
export function getWidgetDimensionsForType(
  size: WidgetSize,
  widgetType: string
): WidgetDimensions {
  const baseDims = getWidgetDimensions(size);
  const override = WIDGET_TYPE_OVERRIDES[widgetType];
  
  if (!override) {
    return baseDims;
  }
  
  return {
    ...baseDims,
    ...override,
  };
}

/**
 * Get container classes for a specific widget type
 * @param size - Widget size
 * @param widgetType - Widget type ID
 * @returns Combined CSS classes with type-specific overrides
 */
export function getWidgetContainerClassesForType(
  size: WidgetSize,
  widgetType: string
): string {
  const dims = getWidgetDimensionsForType(size, widgetType);
  return `${dims.gridColSpan} ${dims.minHeight} ${dims.padding} ${dims.borderRadius}`;
}
