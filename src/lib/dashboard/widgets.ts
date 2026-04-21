import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Activity,
  Zap,
  Package,
  Calendar,
  TrendingDown,
} from "lucide-react";

export type WidgetType =
  | "kpi-monthly-sales"
  | "kpi-gross-margin"
  | "kpi-receivables"
  | "kpi-sales-today"
  | "chart-top-products"
  | "chart-top-customers"
  | "chart-sales-7days"
  | "list-critical-stock"
  | "currency-summary"
  | "currency-rates";

export type WidgetSize = "full" | "half" | "quarter";

export interface WidgetDefinition {
  id: WidgetType;
  name: string;
  description: string;
  category: "kpi" | "chart" | "list" | "currency";
  defaultSize: WidgetSize;
  icon: any;
  color: string; // Tailwind color class prefix (blue, green, orange, purple, red, cyan)
  accentGradient: string; // CSS gradient for the top accent
  minWidth?: number; // Min width on grid
  maxWidth?: number; // Max width on grid
}

export const WIDGET_CATALOG: Record<WidgetType, WidgetDefinition> = {
  // KPI Widgets
  "kpi-monthly-sales": {
    id: "kpi-monthly-sales",
    name: "Ventas del Mes",
    description: "Total de ventas del mes actual vs mes pasado",
    category: "kpi",
    defaultSize: "half",
    icon: Calendar,
    color: "blue",
    accentGradient: "from-blue-500 to-blue-600",
  },
  "kpi-gross-margin": {
    id: "kpi-gross-margin",
    name: "Margen Bruto",
    description: "Rentabilidad total del mes",
    category: "kpi",
    defaultSize: "half",
    icon: TrendingUp,
    color: "green",
    accentGradient: "from-green-500 to-green-600",
  },
  "kpi-receivables": {
    id: "kpi-receivables",
    name: "Cuentas por Cobrar",
    description: "Total de facturas pendientes y vencidas",
    category: "kpi",
    defaultSize: "half",
    icon: DollarSign,
    color: "orange",
    accentGradient: "from-orange-500 to-orange-600",
  },
  "kpi-sales-today": {
    id: "kpi-sales-today",
    name: "Ventas Hoy",
    description: "Ingresos del día actual",
    category: "kpi",
    defaultSize: "half",
    icon: Activity,
    color: "purple",
    accentGradient: "from-purple-500 to-purple-600",
  },

  // Chart Widgets
  "chart-top-products": {
    id: "chart-top-products",
    name: "Top 5 Productos",
    description: "Productos más rentables del mes por revenue",
    category: "chart",
    defaultSize: "full",
    icon: TrendingUp,
    color: "purple",
    accentGradient: "from-purple-500 to-purple-600",
  },
  "chart-top-customers": {
    id: "chart-top-customers",
    name: "Top 5 Clientes",
    description: "Clientes más valiosos del mes",
    category: "chart",
    defaultSize: "full",
    icon: Users,
    color: "blue",
    accentGradient: "from-blue-500 to-blue-600",
  },
  "chart-sales-7days": {
    id: "chart-sales-7days",
    name: "Ventas Últimos 7 Días",
    description: "Tendencia diaria de ventas de la última semana",
    category: "chart",
    defaultSize: "full",
    icon: BarChart3,
    color: "blue",
    accentGradient: "from-blue-500 to-blue-600",
  },

  // List Widgets
  "list-critical-stock": {
    id: "list-critical-stock",
    name: "Stock Crítico",
    description: "Productos con stock por debajo del mínimo",
    category: "list",
    defaultSize: "full",
    icon: AlertTriangle,
    color: "red",
    accentGradient: "from-red-500 to-red-600",
  },

  // Currency Widgets
  "currency-summary": {
    id: "currency-summary",
    name: "Resumen de Monedas",
    description: "Inventario valuado por moneda",
    category: "currency",
    defaultSize: "full",
    icon: TrendingDown,
    color: "cyan",
    accentGradient: "from-cyan-500 to-cyan-600",
  },
  "currency-rates": {
    id: "currency-rates",
    name: "Tasas de Cambio",
    description: "Evolución de tasas USD y EUR",
    category: "currency",
    defaultSize: "half",
    icon: Zap,
    color: "cyan",
    accentGradient: "from-cyan-500 to-cyan-600",
  },
};

// Migration map for legacy widget IDs
const LEGACY_WIDGET_ID_MAP: Record<string, WidgetType> = {
  "monthly-sales": "kpi-monthly-sales",
  "gross-margin": "kpi-gross-margin",
  "receivables": "kpi-receivables",
  "sales-today": "kpi-sales-today",
  "top-products": "chart-top-products",
  "top-customers": "chart-top-customers",
  "sales-7days": "chart-sales-7days",
  "critical-stock": "list-critical-stock",
  "currency-summary": "currency-summary",
  "rates": "currency-rates",
};

// Available widgets by category
export const WIDGET_CATEGORIES = {
  kpi: Object.values(WIDGET_CATALOG).filter((w) => w.category === "kpi"),
  chart: Object.values(WIDGET_CATALOG).filter((w) => w.category === "chart"),
  list: Object.values(WIDGET_CATALOG).filter((w) => w.category === "list"),
  currency: Object.values(WIDGET_CATALOG).filter((w) => w.category === "currency"),
};

// Export DashboardWidget from dashboard hooks for convenience
export type { DashboardWidget } from '@/hooks/dashboard/useDashboardLayout';

// Type guard with legacy ID support
export function isValidWidgetType(type: any): type is WidgetType {
  if (type in WIDGET_CATALOG) return true;
  return type in LEGACY_WIDGET_ID_MAP;
}

// Migrate legacy widget ID to current format
export function migrateWidgetId(type: string): WidgetType {
  if (type in WIDGET_CATALOG) return type as WidgetType;
  if (type in LEGACY_WIDGET_ID_MAP) return LEGACY_WIDGET_ID_MAP[type];
  // Fallback: return as-is (will fail validation later)
  return type as WidgetType;
}

// Get available widgets (not already added)
export function getAvailableWidgets(addedWidgetIds: string[]): WidgetDefinition[] {
  return Object.values(WIDGET_CATALOG).filter(
    (widget) => !addedWidgetIds.includes(widget.id)
  );
}
