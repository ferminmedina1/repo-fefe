/**
 * WIDGET PRESETS
 * ===============
 * Pre-configured widget templates that users can instantly apply
 * Each preset includes multiple metrics, layout, colors, and settings
 * 
 * ✨ Users can select a template → entire dashboard is configured instantly
 */

import { DashboardWidget } from "@/lib/dashboard/widgets";

export interface WidgetPreset {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'inventory' | 'finance' | 'customers' | 'operations' | 'marketing';
  icon: string;
  widgets: DashboardWidget[];
  thumbnail?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  popular?: boolean;
}

/**
 * Pre-built widget templates
 * Users can apply these instantly to set up an entire dashboard layout
 */
export const WIDGET_PRESETS: Record<string, WidgetPreset> = {
  // ============================================
  // SALES DASHBOARDS
  // ============================================
  'sales-executive-summary': {
    id: 'sales-executive-summary',
    name: 'Resumen Ejecutivo de Ventas',
    description: 'Vista de alto nivel de ventas, clientes y tendencias',
    category: 'sales',
    icon: '📈',
    difficulty: 'beginner',
    popular: true,
    tags: ['ventas', 'ejecutivo', 'resumen'],
    widgets: [
      {
        id: 'widget-sales-month',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: {
          metricId: 'sales-monthly-total',
        },
      },
      {
        id: 'widget-sales-today',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: {
          metricId: 'sales-today',
        },
      },
      {
        id: 'widget-active-customers',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: {
          metricId: 'active-customers-month',
        },
      },
      {
        id: 'widget-avg-transaction',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: {
          metricId: 'average-transaction',
        },
      },
      {
        id: 'widget-sales-7days-chart',
        type: 'custom-chart',
        size: 'half',
        metricConfig: {
          metricId: 'sales-7days',
        },
      },
      {
        id: 'widget-by-category',
        type: 'custom-chart',
        size: 'half',
        metricConfig: {
          metricId: 'sales-by-category',
        },
      },
    ],
  },

  'sales-detailed-analysis': {
    id: 'sales-detailed-analysis',
    name: 'Análisis Detallado de Ventas',
    description: 'Métricas profundas de sales, conversión y comportamiento',
    category: 'sales',
    icon: '📊',
    difficulty: 'intermediate',
    tags: ['ventas', 'análisis', 'detallado'],
    widgets: [
      {
        id: 'widget-monthly-revenue',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'sales-monthly-total' },
      },
      {
        id: 'widget-mtd-vs-ltm',
        type: 'custom-chart',
        size: 'half',
        metricConfig: { customFormula: 'COMPARE(MTD, LTM)' },
      },
      {
        id: 'widget-conversion-rate',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'conversion-rate' },
      },
      {
        id: 'widget-sales-by-rep',
        type: 'custom-chart',
        size: 'full',
        metricConfig: { customFormula: 'GROUP BY sales_rep' },
      },
    ],
  },

  // ============================================
  // INVENTORY DASHBOARDS
  // ============================================
  'inventory-health-check': {
    id: 'inventory-health-check',
    name: 'Control de Salud del Inventario',
    description: 'Stock crítico, rotación, valuación y alertas',
    category: 'inventory',
    icon: '📦',
    difficulty: 'beginner',
    popular: true,
    tags: ['inventario', 'stock', 'alertas'],
    widgets: [
      {
        id: 'widget-total-inventory-value',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'inventory-total-value' },
      },
      {
        id: 'widget-critical-stock',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'stock-critical' },
      },
      {
        id: 'widget-out-of-stock',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'products-out-of-stock' },
      },
      {
        id: 'widget-turnover',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'inventory-turnover' },
      },
      {
        id: 'widget-critical-products-list',
        type: 'list',
        size: 'full',
        metricConfig: { metricId: 'stock-critical' },
      },
    ],
  },

  'warehouse-management': {
    id: 'warehouse-management',
    name: 'Gestión de Almacenes',
    description: 'Visibilidad multi-almacén con stock, costos y localización',
    category: 'inventory',
    icon: '🏭',
    difficulty: 'advanced',
    tags: ['almacén', 'multi-ubicación', 'gestión'],
    widgets: [
      {
        id: 'widget-by-warehouse',
        type: 'custom-chart',
        size: 'full',
        metricConfig: { customFormula: 'GROUP BY warehouse' },
      },
      {
        id: 'widget-warehouse-utilization',
        type: 'custom-chart',
        size: 'half',
        metricConfig: { customFormula: 'SUM(quantity) / capacity' },
      },
      {
        id: 'widget-slow-moving',
        type: 'list',
        size: 'half',
        metricConfig: { customFormula: 'low_turnover_items' },
      },
    ],
  },

  // ============================================
  // FINANCE DASHBOARDS
  // ============================================
  'financial-overview': {
    id: 'financial-overview',
    name: 'Vista Financiera General',
    description: 'Rentabilidad, flujo de caja, márgenes y análisis P&L',
    category: 'finance',
    icon: '💰',
    difficulty: 'intermediate',
    popular: true,
    tags: ['finanzas', 'rentabilidad', 'flujo-caja'],
    widgets: [
      {
        id: 'widget-gross-margin',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'gross-margin' },
      },
      {
        id: 'widget-receivables',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'receivables' },
      },
      {
        id: 'widget-payables',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'payables' },
      },
      {
        id: 'widget-cash-flow',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'cash-flow' },
      },
      {
        id: 'widget-cash-flow-trend',
        type: 'custom-chart',
        size: 'full',
        metricConfig: { metricId: 'cash-flow' },
      },
    ],
  },

  'accounting-dashboard': {
    id: 'accounting-dashboard',
    name: 'Panel de Contabilidad',
    description: 'Detalles de ingresos, gastos, impuestos y auditoría',
    category: 'finance',
    icon: '📑',
    difficulty: 'advanced',
    tags: ['contabilidad', 'auditoría', 'impuestos'],
    widgets: [
      {
        id: 'widget-revenue-by-account',
        type: 'custom-chart',
        size: 'half',
        metricConfig: { customFormula: 'GROUP BY account_type' },
      },
      {
        id: 'widget-expense-breakdown',
        type: 'custom-chart',
        size: 'half',
        metricConfig: { customFormula: 'GROUP BY expense_category' },
      },
      {
        id: 'widget-tax-liability',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'CALCULATE_TAX()' },
      },
    ],
  },

  // ============================================
  // CUSTOMER DASHBOARDS
  // ============================================
  'customer-insights': {
    id: 'customer-insights',
    name: 'Insights de Clientes',
    description: 'Adquisición, retención, LTV y segmentación',
    category: 'customers',
    icon: '👥',
    difficulty: 'beginner',
    popular: true,
    tags: ['clientes', 'adquisición', 'retención'],
    widgets: [
      {
        id: 'widget-total-customers',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'total-customers' },
      },
      {
        id: 'widget-new-customers',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'customer-acquisition' },
      },
      {
        id: 'widget-active-customers',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'active-customers-month' },
      },
      {
        id: 'widget-ltv',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { metricId: 'customer-lifetime-value' },
      },
      {
        id: 'widget-customer-growth',
        type: 'custom-chart',
        size: 'full',
        metricConfig: { metricId: 'customer-acquisition' },
      },
    ],
  },

  'customer-segmentation': {
    id: 'customer-segmentation',
    name: 'Segmentación de Clientes',
    description: 'Análisis por cohortes, RFM, y comportamiento',
    category: 'customers',
    icon: '🎯',
    difficulty: 'advanced',
    tags: ['segmentación', 'rfm', 'cohortes'],
    widgets: [
      {
        id: 'widget-by-segment',
        type: 'custom-chart',
        size: 'half',
        metricConfig: { customFormula: 'GROUP BY customer_segment' },
      },
      {
        id: 'widget-rfm-analysis',
        type: 'custom-chart',
        size: 'half',
        metricConfig: { customFormula: 'RFM_ANALYSIS()' },
      },
      {
        id: 'widget-churn-risk',
        type: 'list',
        size: 'full',
        metricConfig: { customFormula: 'at_risk_customers' },
      },
    ],
  },

  // ============================================
  // MARKETING DASHBOARDS
  // ============================================
  'marketing-performance': {
    id: 'marketing-performance',
    name: 'Desempeño Marketing',
    description: 'ROI, leads, conversiones y campaigns',
    category: 'marketing',
    icon: '📢',
    difficulty: 'intermediate',
    popular: true,
    tags: ['marketing', 'roi', 'conversión'],
    widgets: [
      {
        id: 'widget-leads-mtd',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'COUNT(leads) WHERE month = CURRENT_MONTH' },
      },
      {
        id: 'widget-conversion-rate-kpi',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'leads_converted / total_leads' },
      },
      {
        id: 'widget-cac',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'marketing_spend / customers_acquired' },
      },
      {
        id: 'widget-marketing-roi',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'revenue_generated / marketing_spend' },
      },
      {
        id: 'widget-campaign-performance',
        type: 'custom-chart',
        size: 'full',
        metricConfig: { customFormula: 'GROUP BY campaign' },
      },
    ],
  },

  // ============================================
  // OPERATIONS DASHBOARDS
  // ============================================
  'operations-dashboard': {
    id: 'operations-dashboard',
    name: 'Panel Operacional',
    description: 'KPIs de eficiencia, rendimiento y productividad',
    category: 'operations',
    icon: '⚙️',
    difficulty: 'intermediate',
    popular: true,
    tags: ['operaciones', 'eficiencia', 'productividad'],
    widgets: [
      {
        id: 'widget-orders-pending',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'COUNT(orders) WHERE status = pending' },
      },
      {
        id: 'widget-avg-delivery-time',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'AVG(delivery_time_days)' },
      },
      {
        id: 'widget-order-fulfillment',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'on_time_orders / total_orders' },
      },
      {
        id: 'widget-employee-productivity',
        type: 'custom-kpi',
        size: 'quarter',
        metricConfig: { customFormula: 'units_processed / employee' },
      },
      {
        id: 'widget-processing-queue',
        type: 'list',
        size: 'full',
        metricConfig: { customFormula: 'pending_tasks_by_user' },
      },
    ],
  },
};

/**
 * Helper function to get all presets by category
 */
export function getWidgetPresetsByCategory(
  category: WidgetPreset['category']
): WidgetPreset[] {
  return Object.values(WIDGET_PRESETS).filter((preset) => preset.category === category);
}

/**
 * Helper function to get popular presets
 */
export function getPopularWidgetPresets(): WidgetPreset[] {
  return Object.values(WIDGET_PRESETS).filter((preset) => preset.popular);
}

/**
 * Helper function to search presets
 */
export function searchWidgetPresets(query: string): WidgetPreset[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(WIDGET_PRESETS).filter((preset) =>
    preset.name.toLowerCase().includes(lowerQuery) ||
    preset.description.toLowerCase().includes(lowerQuery) ||
    preset.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
