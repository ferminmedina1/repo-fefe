/**
 * WIDGET CUSTOMIZER
 * =================
 * Advanced widget customization options
 * Colors, themes, formats, display options, and more
 * 
 * ✨ Every widget can be deeply customized
 */

// ============================================
// COLOR THEMES & PALETTES
// ============================================

export type ColorTheme = 'light' | 'dark' | 'custom';
export type ColorScheme = 'default' | 'vibrant' | 'pastel' | 'grayscale' | 'professional';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  neutral: string;
  text: string;
  background: string;
}

/**
 * Pre-configured color palettes for different themes
 */
export const COLOR_PALETTES: Record<ColorScheme, ColorPalette> = {
  default: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    neutral: '#6b7280',
    text: '#1f2937',
    background: '#f9fafb',
  },
  vibrant: {
    primary: '#ff006e',
    secondary: '#00f5ff',
    accent: '#ffbe0b',
    success: '#3a86ff',
    warning: '#fb5607',
    error: '#ff006e',
    neutral: '#8338ec',
    text: '#0d0d0d',
    background: '#fafafa',
  },
  pastel: {
    primary: '#a8dadc',
    secondary: '#f1faee',
    accent: '#e63946',
    success: '#06d6a0',
    warning: '#f4d58d',
    error: '#ee8b60',
    neutral: '#c1c5d0',
    text: '#2d3436',
    background: '#f8f9fa',
  },
  grayscale: {
    primary: '#4b5563',
    secondary: '#9ca3af',
    accent: '#6b7280',
    success: '#6b7280',
    warning: '#9ca3af',
    error: '#4b5563',
    neutral: '#d1d5db',
    text: '#111827',
    background: '#f3f4f6',
  },
  professional: {
    primary: '#1e40af',
    secondary: '#1f2937',
    accent: '#047857',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    neutral: '#6b7280',
    text: '#0f172a',
    background: '#f8fafc',
  },
};

// ============================================
// WIDGET DISPLAY OPTIONS
// ============================================

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'composite';
export type DisplayFormat = 'number' | 'currency' | 'percentage' | 'decimal' | 'duration' | 'ratio';
export type Aggregation = 'sum' | 'avg' | 'max' | 'min' | 'count' | 'median';

export interface WidgetCustomizationOptions {
  // Basic
  title: string;
  description?: string;
  icon?: string;

  // Colors & Theme
  colorScheme: ColorScheme;
  customColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  borderColor?: string;

  // Display
  displayFormat: DisplayFormat;
  decimals?: number;
  showTrend?: boolean;
  trendPeriod?: 'day' | 'week' | 'month' | 'year';
  showComparison?: boolean;
  comparisonPeriod?: 'previous' | 'year_ago' | 'custom';

  // Chart Options (if applicable)
  chartType?: ChartType;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  stackBars?: boolean;
  aspectRatio?: 'square' | 'wide' | 'tall' | 'custom';

  // Data Aggregation
  aggregation?: Aggregation;
  groupBy?: string;
  filterBy?: Record<string, any>;
  sortBy?: 'value' | 'date' | 'name' | 'custom';
  sortOrder?: 'asc' | 'desc';
  limit?: number;

  // Display Preferences
  density?: 'compact' | 'normal' | 'spacious';
  fontSize?: 'small' | 'normal' | 'large';
  fontWeight?: 'normal' | 'semibold' | 'bold';
  borderRadius?: 'none' | 'small' | 'normal' | 'large';
  shadow?: 'none' | 'small' | 'normal' | 'large';

  // Interactivity
  enableDrill?: boolean;
  enableExport?: boolean;
  enableRefresh?: boolean;
  refreshInterval?: number; // in seconds

  // Advanced
  customCSS?: string;
  dataTransform?: string;
  conditions?: WidgetCondition[];
}

export interface WidgetCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: any;
  action: 'color' | 'highlight' | 'hide' | 'alert';
}

// ============================================
// WIDGET DEFAULTS & PRESETS
// ============================================

export const DEFAULT_CUSTOMIZATION: WidgetCustomizationOptions = {
  title: 'Widget',
  colorScheme: 'default',
  displayFormat: 'number',
  decimals: 2,
  showTrend: true,
  trendPeriod: 'month',
  showComparison: false,
  chartType: 'bar',
  showLegend: true,
  showGrid: true,
  showTooltip: true,
  animate: true,
  stackBars: false,
  aspectRatio: 'wide',
  aggregation: 'sum',
  sortOrder: 'desc',
  density: 'normal',
  fontSize: 'normal',
  fontWeight: 'normal',
  borderRadius: 'normal',
  shadow: 'small',
  enableDrill: true,
  enableExport: true,
  enableRefresh: true,
  refreshInterval: 0,
};

/**
 * KPI Widget Preset - Optimized for showing single metrics
 */
export const KPI_CUSTOMIZATION_PRESET: Partial<WidgetCustomizationOptions> = {
  displayFormat: 'number',
  showTrend: true,
  fontSize: 'large',
  fontWeight: 'bold',
  density: 'spacious',
  chartType: undefined,
  showLegend: false,
};

/**
 * Chart Widget Preset - Optimized for visualizations
 */
export const CHART_CUSTOMIZATION_PRESET: Partial<WidgetCustomizationOptions> = {
  chartType: 'bar',
  showLegend: true,
  showGrid: true,
  showTooltip: true,
  animate: true,
  aspectRatio: 'wide',
  density: 'normal',
};

/**
 * List Widget Preset - Optimized for data tables
 */
export const LIST_CUSTOMIZATION_PRESET: Partial<WidgetCustomizationOptions> = {
  displayFormat: 'number',
  density: 'compact',
  fontSize: 'small',
  showLegend: false,
  enableDrill: true,
  limit: 10,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Merge custom options with defaults
 */
export function mergeCustomizationOptions(
  custom?: Partial<WidgetCustomizationOptions>,
  preset?: Partial<WidgetCustomizationOptions>
): WidgetCustomizationOptions {
  return {
    ...DEFAULT_CUSTOMIZATION,
    ...(preset || {}),
    ...(custom || {}),
  };
}

/**
 * Get color from palette
 */
export function getColorFromPalette(
  scheme: ColorScheme,
  colorName: keyof ColorPalette
): string {
  return COLOR_PALETTES[scheme][colorName];
}

/**
 * Apply conditions to widget data
 */
export function applyConditions(
  data: any[] | null | undefined,
  conditions: WidgetCondition[] = []
): any[] {
  // Handle null/undefined/empty data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return data || [];
  }

  // No conditions to apply
  if (!conditions || conditions.length === 0) {
    return data;
  }

  return data.map((item) => {
    conditions.forEach((condition) => {
      const value = item[condition.field];
      let conditionMet = false;

      switch (condition.operator) {
        case 'eq':
          conditionMet = value === condition.value;
          break;
        case 'neq':
          conditionMet = value !== condition.value;
          break;
        case 'gt':
          conditionMet = value > condition.value;
          break;
        case 'gte':
          conditionMet = value >= condition.value;
          break;
        case 'lt':
          conditionMet = value < condition.value;
          break;
        case 'lte':
          conditionMet = value <= condition.value;
          break;
        case 'contains':
          conditionMet = String(value).includes(String(condition.value));
          break;
        case 'in':
          conditionMet = Array.isArray(condition.value) &&
            condition.value.includes(value);
          break;
      }

      if (conditionMet) {
        if (condition.action === 'color') {
          item._highlight = condition.value;
        } else if (condition.action === 'highlight') {
          item._highlighted = true;
        } else if (condition.action === 'alert') {
          item._alert = condition.value;
        }
      }
    });
    return item;
  });
}

/**
 * Format display value based on options
 */
export function formatValue(
  value: number,
  options: WidgetCustomizationOptions
): string {
  const decimals = options.decimals ?? 2;

  switch (options.displayFormat) {
    case 'currency':
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: decimals,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(decimals)}%`;
    case 'duration':
      return formatDuration(value);
    case 'ratio':
      return `1:${(1 / value).toFixed(decimals)}`;
    case 'decimal':
      return value.toFixed(decimals);
    case 'number':
    default:
      return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}

/**
 * Format duration in seconds to readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

/**
 * Get CSS classes based on customization options
 */
export function getCustomizationClasses(options: WidgetCustomizationOptions): string {
  const classes: string[] = [];

  // Density
  if (options.density === 'compact') classes.push('space-y-1');
  if (options.density === 'spacious') classes.push('space-y-4');

  // Font size
  if (options.fontSize === 'small') classes.push('text-sm');
  if (options.fontSize === 'large') classes.push('text-lg');

  // Font weight
  if (options.fontWeight === 'semibold') classes.push('font-semibold');
  if (options.fontWeight === 'bold') classes.push('font-bold');

  // Border radius
  if (options.borderRadius === 'none') classes.push('rounded-none');
  if (options.borderRadius === 'small') classes.push('rounded');
  if (options.borderRadius === 'large') classes.push('rounded-2xl');

  // Shadow
  if (options.shadow === 'none') classes.push('shadow-none');
  if (options.shadow === 'normal') classes.push('shadow');
  if (options.shadow === 'large') classes.push('shadow-lg');

  return classes.join(' ');
}
