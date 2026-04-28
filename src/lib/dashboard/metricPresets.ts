/**
 * METRIC PRESETS
 * ================
 * Pre-configured metric definitions for quick widget creation
 * Users can select these presets to instantly create metrics
 */

import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  PieChart,
  BarChart3,
  Package,
  Clock,
  Target,
  Zap,
  Heart,
  Eye,
  Send,
} from 'lucide-react';

export type MetricCategory = 'sales' | 'inventory' | 'customers' | 'finance' | 'products';

export interface MetricPreset {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  icon: any;
  color: string;
  formula?: string;
  dataSource?: string;
  format?: 'currency' | 'number' | 'percentage' | 'decimal';
  unit?: string;
  defaultChartType?: 'line' | 'bar' | 'pie' | 'area';
  trend?: {
    enabled: boolean;
    period: 'day' | 'week' | 'month' | 'year';
  };
}

/**
 * Pre-built metric templates ready to use
 * ✅ User can click "Add Metric" → select preset → widget is created instantly
 */
export const METRIC_PRESETS: Record<string, MetricPreset> = {
  // ============================================
  // SALES METRICS
  // ============================================
  'sales-monthly-total': {
    id: 'sales-monthly-total',
    name: 'Ventas del Mes',
    description: 'Total de ingresos del mes actual',
    category: 'sales',
    icon: DollarSign,
    color: 'green',
    format: 'currency',
    unit: 'ARS',
    trend: { enabled: true, period: 'month' },
    formula: 'SUM(sales.amount) WHERE DATE(sales.created_at) = CURRENT_MONTH()',
  },
  'sales-today': {
    id: 'sales-today',
    name: 'Ventas Hoy',
    description: 'Ingresos del día actual',
    category: 'sales',
    icon: TrendingUp,
    color: 'blue',
    format: 'currency',
    unit: 'ARS',
    trend: { enabled: true, period: 'day' },
    formula: 'SUM(sales.amount) WHERE DATE(sales.created_at) = TODAY()',
  },
  'sales-7days': {
    id: 'sales-7days',
    name: 'Ventas Últimos 7 Días',
    description: 'Total de ingresos de la última semana',
    category: 'sales',
    icon: BarChart3,
    color: 'purple',
    format: 'currency',
    unit: 'ARS',
    defaultChartType: 'line',
    formula: 'SUM(sales.amount) WHERE DATE(sales.created_at) >= DATE_SUB(TODAY(), INTERVAL 7 DAY)',
  },
  'sales-by-category': {
    id: 'sales-by-category',
    name: 'Ventas por Categoría',
    description: 'Desglose de ventas por categoría de producto',
    category: 'sales',
    icon: PieChart,
    color: 'orange',
    format: 'currency',
    defaultChartType: 'pie',
    formula: 'SUM(sales.amount) GROUP BY products.category',
  },
  'average-transaction': {
    id: 'average-transaction',
    name: 'Ticket Promedio',
    description: 'Monto promedio por transacción',
    category: 'sales',
    icon: DollarSign,
    color: 'cyan',
    format: 'currency',
    unit: 'ARS',
    formula: 'AVG(sales.amount)',
  },

  // ============================================
  // INVENTORY METRICS
  // ============================================
  'inventory-total-value': {
    id: 'inventory-total-value',
    name: 'Valor Total del Inventario',
    description: 'Valuación total del stock en ARS',
    category: 'inventory',
    icon: Package,
    color: 'blue',
    format: 'currency',
    unit: 'ARS',
    formula: 'SUM(inventory.quantity * inventory.unit_cost)',
  },
  'stock-critical': {
    id: 'stock-critical',
    name: 'Stock Crítico',
    description: 'Cantidad de productos por debajo del stock mínimo',
    category: 'inventory',
    icon: AlertTriangle,
    color: 'red',
    format: 'number',
    formula: 'COUNT(inventory.id) WHERE inventory.quantity < inventory.min_stock',
  },
  'inventory-turnover': {
    id: 'inventory-turnover',
    name: 'Rotación de Inventario',
    description: 'Veces que el inventario se renueva por período',
    category: 'inventory',
    icon: TrendingUp,
    color: 'green',
    format: 'decimal',
    formula: 'COGS / AVG_INVENTORY',
  },
  'products-out-of-stock': {
    id: 'products-out-of-stock',
    name: 'Productos Agotados',
    description: 'Cantidad de productos sin stock',
    category: 'inventory',
    icon: AlertTriangle,
    color: 'red',
    format: 'number',
    formula: 'COUNT(inventory.id) WHERE inventory.quantity = 0',
  },

  // ============================================
  // CUSTOMER METRICS
  // ============================================
  'total-customers': {
    id: 'total-customers',
    name: 'Total de Clientes',
    description: 'Cantidad total de clientes registrados',
    category: 'customers',
    icon: Users,
    color: 'purple',
    format: 'number',
    formula: 'COUNT(customers.id)',
  },
  'active-customers-month': {
    id: 'active-customers-month',
    name: 'Clientes Activos (Mes)',
    description: 'Clientes que realizaron compras este mes',
    category: 'customers',
    icon: Users,
    color: 'green',
    format: 'number',
    formula: 'COUNT(DISTINCT sales.customer_id) WHERE DATE(sales.created_at) = CURRENT_MONTH()',
  },
  'customer-acquisition': {
    id: 'customer-acquisition',
    name: 'Nuevos Clientes',
    description: 'Clientes registrados en el período',
    category: 'customers',
    icon: Users,
    color: 'blue',
    format: 'number',
    trend: { enabled: true, period: 'month' },
    formula: 'COUNT(customers.id) WHERE DATE(customers.created_at) = CURRENT_MONTH()',
  },
  'customer-lifetime-value': {
    id: 'customer-lifetime-value',
    name: 'Valor del Cliente (LTV)',
    description: 'Promedio de ingresos por cliente',
    category: 'customers',
    icon: DollarSign,
    color: 'green',
    format: 'currency',
    unit: 'ARS',
    formula: 'SUM(sales.amount) / COUNT(DISTINCT customers.id)',
  },

  // ============================================
  // FINANCE METRICS
  // ============================================
  'gross-margin': {
    id: 'gross-margin',
    name: 'Margen Bruto',
    description: 'Porcentaje de rentabilidad del período',
    category: 'finance',
    icon: TrendingUp,
    color: 'green',
    format: 'percentage',
    trend: { enabled: true, period: 'month' },
    formula: '(REVENUE - COGS) / REVENUE * 100',
  },
  'receivables': {
    id: 'receivables',
    name: 'Cuentas por Cobrar',
    description: 'Total de facturas pendientes y vencidas',
    category: 'finance',
    icon: DollarSign,
    color: 'orange',
    format: 'currency',
    unit: 'ARS',
    formula: 'SUM(sales.amount) WHERE sales.status = "pending"',
  },
  'payables': {
    id: 'payables',
    name: 'Cuentas por Pagar',
    description: 'Total de compras pendientes',
    category: 'finance',
    icon: DollarSign,
    color: 'red',
    format: 'currency',
    unit: 'ARS',
    formula: 'SUM(purchase_orders.amount) WHERE purchase_orders.status = "pending"',
  },
  'cash-flow': {
    id: 'cash-flow',
    name: 'Flujo de Caja',
    description: 'Diferencia entre ingresos y egresos',
    category: 'finance',
    icon: TrendingUp,
    color: 'green',
    format: 'currency',
    unit: 'ARS',
    defaultChartType: 'area',
    formula: 'REVENUE - EXPENSES',
  },

  // ============================================
  // PRODUCTS METRICS
  // ============================================
  'top-selling-products': {
    id: 'top-selling-products',
    name: 'Top 5 Productos',
    description: 'Productos más vendidos por ingresos',
    category: 'products',
    icon: ShoppingCart,
    color: 'blue',
    format: 'currency',
    defaultChartType: 'bar',
    formula: 'SUM(sales.amount) GROUP BY products.name ORDER BY SUM DESC LIMIT 5',
  },
  'product-categories': {
    id: 'product-categories',
    name: 'Productos por Categoría',
    description: 'Cantidad de productos por cada categoría',
    category: 'products',
    icon: Package,
    color: 'purple',
    format: 'number',
    defaultChartType: 'pie',
    formula: 'COUNT(products.id) GROUP BY products.category',
  },
  'low-performing-products': {
    id: 'low-performing-products',
    name: 'Productos Bajo Rendimiento',
    description: 'Productos con pocas ventas en el último mes',
    category: 'products',
    icon: AlertTriangle,
    color: 'orange',
    format: 'number',
    formula: 'COUNT(products.id) WHERE SUM(sales.quantity) < 10 AND DATE(sales.created_at) >= DATE_SUB(TODAY(), INTERVAL 30 DAY)',
  },

  // ============================================
  // ADVANCED SALES METRICS
  // ============================================
  'sales-30days': {
    id: 'sales-30days',
    name: 'Ventas Últimos 30 Días',
    description: 'Total de ingresos del último mes',
    category: 'sales',
    icon: BarChart3,
    color: 'blue',
    format: 'currency',
    unit: 'ARS',
    defaultChartType: 'line',
    formula: 'SUM(sales.amount) WHERE DATE(sales.created_at) >= DATE_SUB(TODAY(), INTERVAL 30 DAY)',
  },
  'sales-90days': {
    id: 'sales-90days',
    name: 'Ventas Últimos 90 Días',
    description: 'Total de ingresos del trimestre',
    category: 'sales',
    icon: BarChart3,
    color: 'green',
    format: 'currency',
    unit: 'ARS',
    defaultChartType: 'area',
    formula: 'SUM(sales.amount) WHERE DATE(sales.created_at) >= DATE_SUB(TODAY(), INTERVAL 90 DAY)',
  },
  'sales-year-to-date': {
    id: 'sales-year-to-date',
    name: 'Ventas Año Actual',
    description: 'Total de ingresos desde inicio de año',
    category: 'sales',
    icon: TrendingUp,
    color: 'purple',
    format: 'currency',
    unit: 'ARS',
    defaultChartType: 'area',
    formula: 'SUM(sales.amount) WHERE YEAR(sales.created_at) = YEAR(CURRENT_DATE())',
  },
  'daily-average-sales': {
    id: 'daily-average-sales',
    name: 'Promedio Diario de Ventas',
    description: 'Ingreso promedio por día',
    category: 'sales',
    icon: DollarSign,
    color: 'cyan',
    format: 'currency',
    unit: 'ARS',
    formula: 'SUM(sales.amount) / COUNT(DISTINCT DATE(sales.created_at))',
  },
  'sales-by-region': {
    id: 'sales-by-region',
    name: 'Ventas por Región',
    description: 'Desglose de ventas por región geográfica',
    category: 'sales',
    icon: PieChart,
    color: 'indigo',
    format: 'currency',
    defaultChartType: 'pie',
    formula: 'SUM(sales.amount) GROUP BY regions.name',
  },
  'sales-growth-month': {
    id: 'sales-growth-month',
    name: 'Crecimiento Mes Anterior',
    description: 'Cambio porcentual vs mes anterior',
    category: 'sales',
    icon: TrendingUp,
    color: 'green',
    format: 'percentage',
    formula: '(CURRENT_MONTH - PREVIOUS_MONTH) / PREVIOUS_MONTH * 100',
  },
  'conversion-rate': {
    id: 'conversion-rate',
    name: 'Tasa de Conversión',
    description: 'Porcentaje de conversión de clientes',
    category: 'sales',
    icon: Target,
    color: 'amber',
    format: 'percentage',
    formula: 'sales_count / visitors_count * 100',
  },
  'cart-abandonment': {
    id: 'cart-abandonment',
    name: 'Carritos Abandonados',
    description: 'Porcentaje de carritos sin completar',
    category: 'sales',
    icon: ShoppingCart,
    color: 'red',
    format: 'percentage',
    formula: 'abandoned_carts / total_carts * 100',
  },

  // ============================================
  // ADVANCED INVENTORY METRICS
  // ============================================
  'stock-health': {
    id: 'stock-health',
    name: 'Salud del Stock',
    description: 'Porcentaje de productos con stock óptimo',
    category: 'inventory',
    icon: Package,
    color: 'green',
    format: 'percentage',
    formula: 'optimal_stock / total_products * 100',
  },
  'slow-moving-items': {
    id: 'slow-moving-items',
    name: 'Productos de Rotación Lenta',
    description: 'Cantidad de productos con baja rotación',
    category: 'inventory',
    icon: AlertTriangle,
    color: 'orange',
    format: 'number',
    formula: 'COUNT(products.id) WHERE inventory_turnover < 2',
  },
  'inventory-aging': {
    id: 'inventory-aging',
    name: 'Antigüedad del Inventario',
    description: 'Días promedio en inventario',
    category: 'inventory',
    icon: Clock,
    color: 'blue',
    format: 'number',
    unit: 'días',
    formula: 'AVG(DATEDIFF(TODAY(), inventory.last_sold_date))',
  },
  'stock-variance': {
    id: 'stock-variance',
    name: 'Varianza de Stock',
    description: 'Diferencia entre conteo físico y sistema',
    category: 'inventory',
    icon: AlertTriangle,
    color: 'red',
    format: 'percentage',
    formula: 'ABS(physical_count - system_count) / system_count * 100',
  },
  'lead-time-avg': {
    id: 'lead-time-avg',
    name: 'Tiempo Promedio de Entrega',
    description: 'Días promedio de reposición de stock',
    category: 'inventory',
    icon: Clock,
    color: 'blue',
    format: 'number',
    unit: 'días',
    formula: 'AVG(DATEDIFF(delivery_date, order_date))',
  },
  'warehouse-capacity': {
    id: 'warehouse-capacity',
    name: 'Utilización de Almacén',
    description: 'Porcentaje de capacidad usada',
    category: 'inventory',
    icon: Package,
    color: 'purple',
    format: 'percentage',
    formula: 'current_volume / max_capacity * 100',
  },

  // ============================================
  // ADVANCED CUSTOMER METRICS
  // ============================================
  'repeat-customer-rate': {
    id: 'repeat-customer-rate',
    name: 'Tasa de Clientes Recurrentes',
    description: 'Porcentaje de clientes que vuelven a comprar',
    category: 'customers',
    icon: Users,
    color: 'green',
    format: 'percentage',
    formula: 'repeat_customers / total_customers * 100',
  },
  'customer-churn-rate': {
    id: 'customer-churn-rate',
    name: 'Tasa de Churn',
    description: 'Porcentaje de clientes perdidos',
    category: 'customers',
    icon: AlertTriangle,
    color: 'red',
    format: 'percentage',
    formula: 'lost_customers / start_customers * 100',
  },
  'customer-satisfaction': {
    id: 'customer-satisfaction',
    name: 'Satisfacción del Cliente',
    description: 'Puntuación NPS promedio',
    category: 'customers',
    icon: Heart,
    color: 'pink',
    format: 'number',
    formula: 'AVG(nps_score)',
  },
  'clv-to-cac-ratio': {
    id: 'clv-to-cac-ratio',
    name: 'Ratio CLV:CAC',
    description: 'Relación entre valor y costo de cliente',
    category: 'customers',
    icon: DollarSign,
    color: 'green',
    format: 'ratio',
    formula: 'CLV / CAC',
  },
  'customer-segments': {
    id: 'customer-segments',
    name: 'Clientes por Segmento',
    description: 'Distribución de clientes por segmentos',
    category: 'customers',
    icon: PieChart,
    color: 'purple',
    format: 'number',
    defaultChartType: 'pie',
    formula: 'COUNT(customers.id) GROUP BY segments.name',
  },
  'first-time-buyer-rate': {
    id: 'first-time-buyer-rate',
    name: 'Tasa de Nuevos Compradores',
    description: 'Porcentaje de primeras compras',
    category: 'customers',
    icon: Users,
    color: 'blue',
    format: 'percentage',
    formula: 'first_time_buyers / total_transactions * 100',
  },

  // ============================================
  // ADVANCED FINANCE METRICS
  // ============================================
  'operating-margin': {
    id: 'operating-margin',
    name: 'Margen Operativo',
    description: 'Porcentaje de ganancia operativa',
    category: 'finance',
    icon: TrendingUp,
    color: 'green',
    format: 'percentage',
    formula: '(OPERATING_INCOME / REVENUE) * 100',
  },
  'net-profit-margin': {
    id: 'net-profit-margin',
    name: 'Margen Neto',
    description: 'Porcentaje de ganancia neta',
    category: 'finance',
    icon: TrendingUp,
    color: 'green',
    format: 'percentage',
    formula: '(NET_PROFIT / REVENUE) * 100',
  },
  'roa': {
    id: 'roa',
    name: 'ROA (Retorno sobre Activos)',
    description: 'Eficiencia en uso de activos',
    category: 'finance',
    icon: TrendingUp,
    color: 'green',
    format: 'percentage',
    formula: '(NET_PROFIT / TOTAL_ASSETS) * 100',
  },
  'debt-to-equity': {
    id: 'debt-to-equity',
    name: 'Ratio Deuda/Equity',
    description: 'Relación entre pasivos y patrimonio',
    category: 'finance',
    icon: DollarSign,
    color: 'orange',
    format: 'ratio',
    formula: 'TOTAL_DEBT / TOTAL_EQUITY',
  },
  'days-sales-outstanding': {
    id: 'days-sales-outstanding',
    name: 'DSO (Días de Venta Pendiente)',
    description: 'Días promedio para cobrar',
    category: 'finance',
    icon: Clock,
    color: 'blue',
    format: 'number',
    unit: 'días',
    formula: '(ACCOUNTS_RECEIVABLE / REVENUE) * 365',
  },
  'inventory-conversion-cycle': {
    id: 'inventory-conversion-cycle',
    name: 'Ciclo de Conversión de Inventario',
    description: 'Días en convertir inventario a efectivo',
    category: 'finance',
    icon: Clock,
    color: 'purple',
    format: 'number',
    unit: 'días',
    formula: 'DIO + DSO - DPO',
  },
  'expense-ratio': {
    id: 'expense-ratio',
    name: 'Ratio de Gastos',
    description: 'Gastos como porcentaje de ingresos',
    category: 'finance',
    icon: DollarSign,
    color: 'red',
    format: 'percentage',
    formula: '(TOTAL_EXPENSES / REVENUE) * 100',
  },
  'tax-rate': {
    id: 'tax-rate',
    name: 'Tasa Efectiva de Impuestos',
    description: 'Impuestos como porcentaje de ingresos',
    category: 'finance',
    icon: DollarSign,
    color: 'amber',
    format: 'percentage',
    formula: '(TOTAL_TAX / GROSS_PROFIT) * 100',
  },

  // ============================================
  // MARKETING METRICS
  // ============================================
  'cac': {
    id: 'cac',
    name: 'Costo de Adquisición (CAC)',
    description: 'Costo promedio para adquirir un cliente',
    category: 'sales',
    icon: DollarSign,
    color: 'orange',
    format: 'currency',
    unit: 'ARS',
    formula: 'MARKETING_SPEND / CUSTOMERS_ACQUIRED',
  },
  'roas': {
    id: 'roas',
    name: 'ROAS (Retorno en Gasto Publicitario)',
    description: 'Ingresos por peso gastado en marketing',
    category: 'sales',
    icon: TrendingUp,
    color: 'green',
    format: 'ratio',
    formula: 'REVENUE / ADVERTISING_SPEND',
  },
  'email-open-rate': {
    id: 'email-open-rate',
    name: 'Tasa de Apertura de Email',
    description: 'Porcentaje de emails abiertos',
    category: 'sales',
    icon: Send,
    color: 'blue',
    format: 'percentage',
    formula: 'opened_emails / sent_emails * 100',
  },
  'click-through-rate': {
    id: 'click-through-rate',
    name: 'CTR (Tasa de Clics)',
    description: 'Porcentaje de clics en anuncios',
    category: 'sales',
    icon: Eye,
    color: 'blue',
    format: 'percentage',
    formula: 'total_clicks / impressions * 100',
  },
  'lead-quality-score': {
    id: 'lead-quality-score',
    name: 'Puntuación de Calidad de Leads',
    description: 'Calificación promedio de leads',
    category: 'sales',
    icon: Target,
    color: 'purple',
    format: 'number',
    formula: 'AVG(lead_score)',
  },
  'social-media-engagement': {
    id: 'social-media-engagement',
    name: 'Engagement en Redes Sociales',
    description: 'Tasa de interacción en redes',
    category: 'sales',
    icon: Heart,
    color: 'pink',
    format: 'percentage',
    formula: 'total_engagement / total_followers * 100',
  },

  // ============================================
  // OPERATIONAL METRICS
  // ============================================
  'order-fulfillment-rate': {
    id: 'order-fulfillment-rate',
    name: 'Tasa de Cumplimiento de Órdenes',
    description: 'Porcentaje de órdenes completadas a tiempo',
    category: 'inventory',
    icon: Package,
    color: 'green',
    format: 'percentage',
    formula: 'on_time_orders / total_orders * 100',
  },
  'average-order-processing-time': {
    id: 'average-order-processing-time',
    name: 'Tiempo Promedio de Procesamiento',
    description: 'Horas promedio para procesar una orden',
    category: 'inventory',
    icon: Clock,
    color: 'blue',
    format: 'decimal',
    unit: 'horas',
    formula: 'AVG(processing_time_hours)',
  },
  'product-defect-rate': {
    id: 'product-defect-rate',
    name: 'Tasa de Defectos',
    description: 'Porcentaje de productos con defectos',
    category: 'products',
    icon: AlertTriangle,
    color: 'red',
    format: 'percentage',
    formula: 'defective_units / total_units * 100',
  },
  'return-rate': {
    id: 'return-rate',
    name: 'Tasa de Devoluciones',
    description: 'Porcentaje de productos devueltos',
    category: 'products',
    icon: BarChart3,
    color: 'orange',
    format: 'percentage',
    formula: 'returned_units / sold_units * 100',
  },
  'on-time-delivery-rate': {
    id: 'on-time-delivery-rate',
    name: 'Tasa de Entrega a Tiempo',
    description: 'Porcentaje de entregas puntuales',
    category: 'inventory',
    icon: Clock,
    color: 'green',
    format: 'percentage',
    formula: 'on_time_deliveries / total_deliveries * 100',
  },
  'average-delivery-cost': {
    id: 'average-delivery-cost',
    name: 'Costo Promedio de Entrega',
    description: 'Costo medio por entrega',
    category: 'inventory',
    icon: DollarSign,
    color: 'orange',
    format: 'currency',
    unit: 'ARS',
    formula: 'TOTAL_DELIVERY_COST / TOTAL_DELIVERIES',
  },
};

/**
 * Group presets by category
 */
export const METRICS_BY_CATEGORY = {
  sales: Object.values(METRIC_PRESETS).filter((m) => m.category === 'sales'),
  inventory: Object.values(METRIC_PRESETS).filter((m) => m.category === 'inventory'),
  customers: Object.values(METRIC_PRESETS).filter((m) => m.category === 'customers'),
  finance: Object.values(METRIC_PRESETS).filter((m) => m.category === 'finance'),
  products: Object.values(METRIC_PRESETS).filter((m) => m.category === 'products'),
};

/**
 * Get preset by ID
 */
export function getMetricPreset(id: string): MetricPreset | null {
  return METRIC_PRESETS[id] || null;
}

/**
 * Get all presets (sorted by category)
 */
export function getAllMetricPresets(): MetricPreset[] {
  return Object.values(METRIC_PRESETS);
}

/**
 * Get presets by category
 */
export function getMetricsByCategory(category: MetricCategory): MetricPreset[] {
  return METRICS_BY_CATEGORY[category] || [];
}

/**
 * Search presets by name or description
 */
export function searchMetricPresets(query: string): MetricPreset[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(METRIC_PRESETS).filter(
    (preset) =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description.toLowerCase().includes(lowerQuery)
  );
}
