import { TrendingUp, Users, Package, BarChart3, AlertTriangle, DollarSign } from 'lucide-react';

export interface DashboardTemplate {
  id: string;
  name: string;
  category: 'saas' | 'ecommerce' | 'inventory' | 'crm' | 'finance';
  description: string;
  icon: React.ReactNode;
  preview: string;
  widgets: Omit<DashboardWidget, 'id'>[];
  layout: {
    gridColumns: number;
    gaps: { x: number; y: number };
    responsive: { mobile: number; tablet: number; desktop: number };
  };
  tags: string[];
  compatibility: {
    minModules: string[];
    suggestedMetrics: string[];
  };
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'metric' | 'alert' | 'gauge';
  position: { x: number; y: number; width: number; height: number };
  config: {
    title: string;
    metric?: string;
    dataSource?: string;
    refreshInterval?: number;
    formatting?: any;
  };
  data?: any;
  isLoading?: boolean;
  error?: string;
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'saas-metrics',
    name: 'SaaS Metrics',
    category: 'saas',
    description: 'MRR, churn, LTV, CAC, runway - todas las métricas clave para tu negocio de suscripción',
    icon: <TrendingUp className="w-6 h-6" />,
    preview: '/templates/saas-metrics.png',
    tags: ['subscriptions', 'revenue', 'growth', 'mrr'],
    widgets: [
      {
        type: 'kpi',
        position: { x: 0, y: 0, width: 3, height: 2 },
        config: {
          title: 'MRR Actual',
          metric: 'mrr_current',
          refreshInterval: 3600,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 3, y: 0, width: 3, height: 2 },
        config: {
          title: 'Churn Rate',
          metric: 'monthly_churn',
          refreshInterval: 3600,
          formatting: { suffix: '%', decimals: 1 }
        }
      },
      {
        type: 'kpi',
        position: { x: 6, y: 0, width: 3, height: 2 },
        config: {
          title: 'LTV',
          metric: 'customer_ltv',
          refreshInterval: 86400,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 9, y: 0, width: 3, height: 2 },
        config: {
          title: 'CAC',
          metric: 'customer_cac',
          refreshInterval: 86400,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'chart',
        position: { x: 0, y: 2, width: 6, height: 4 },
        config: {
          title: 'MRR Histórico',
          metric: 'mrr_history',
          refreshInterval: 3600
        }
      },
      {
        type: 'chart',
        position: { x: 6, y: 2, width: 6, height: 4 },
        config: {
          title: 'Nuevos vs Cancelados (30d)',
          metric: 'new_vs_churn',
          refreshInterval: 3600
        }
      },
    ],
    layout: {
      gridColumns: 12,
      gaps: { x: 16, y: 16 },
      responsive: { mobile: 1, tablet: 6, desktop: 12 }
    },
    compatibility: {
      minModules: ['sales'],
      suggestedMetrics: ['mrr_current', 'monthly_churn', 'ltv', 'cac']
    }
  },

  {
    id: 'ecommerce-ops',
    name: 'Ecommerce Operations',
    category: 'ecommerce',
    description: 'Ventas, inventario, órdenes, clientes - todo lo que necesitas para tu tienda online',
    icon: <Package className="w-6 h-6" />,
    preview: '/templates/ecommerce.png',
    tags: ['sales', 'inventory', 'customers', 'orders'],
    widgets: [
      {
        type: 'kpi',
        position: { x: 0, y: 0, width: 3, height: 2 },
        config: {
          title: 'Ventas Hoy',
          metric: 'sales_today',
          refreshInterval: 600,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 3, y: 0, width: 3, height: 2 },
        config: {
          title: 'Órdenes Pendientes',
          metric: 'pending_orders',
          refreshInterval: 300,
          formatting: { decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 6, y: 0, width: 3, height: 2 },
        config: {
          title: 'Tickets de Soporte',
          metric: 'open_tickets',
          refreshInterval: 600,
          formatting: { decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 9, y: 0, width: 3, height: 2 },
        config: {
          title: 'Avg Order Value',
          metric: 'average_order_value',
          refreshInterval: 3600,
          formatting: { prefix: '$', decimals: 2 }
        }
      },
      {
        type: 'chart',
        position: { x: 0, y: 2, width: 12, height: 4 },
        config: {
          title: 'Ventas Diarias - Últimos 30 días',
          metric: 'daily_sales_30d',
          refreshInterval: 3600
        }
      },
      {
        type: 'table',
        position: { x: 0, y: 6, width: 6, height: 3 },
        config: {
          title: 'Top Productos',
          metric: 'top_products_7d',
          refreshInterval: 3600
        }
      },
      {
        type: 'table',
        position: { x: 6, y: 6, width: 6, height: 3 },
        config: {
          title: 'Ordenes Recientes',
          metric: 'recent_orders',
          refreshInterval: 300
        }
      },
    ],
    layout: {
      gridColumns: 12,
      gaps: { x: 16, y: 16 },
      responsive: { mobile: 1, tablet: 6, desktop: 12 }
    },
    compatibility: {
      minModules: ['sales', 'products'],
      suggestedMetrics: ['sales_today', 'pending_orders', 'average_order_value']
    }
  },

  {
    id: 'inventory-mgmt',
    name: 'Inventory Management',
    category: 'inventory',
    description: 'Stock, alertas, rotación, valuación multi-moneda - control total de tu inventario',
    icon: <AlertTriangle className="w-6 h-6" />,
    preview: '/templates/inventory.png',
    tags: ['warehouse', 'stock', 'alerts', 'locations'],
    widgets: [
      {
        type: 'kpi',
        position: { x: 0, y: 0, width: 3, height: 2 },
        config: {
          title: 'Total de Productos',
          metric: 'total_products_active',
          refreshInterval: 3600,
          formatting: { decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 3, y: 0, width: 3, height: 2 },
        config: {
          title: 'Stock Bajo',
          metric: 'low_stock_count',
          refreshInterval: 1800,
          formatting: { decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 6, y: 0, width: 3, height: 2 },
        config: {
          title: 'Valor Inventario (ARS)',
          metric: 'inventory_value_ars',
          refreshInterval: 3600,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 9, y: 0, width: 3, height: 2 },
        config: {
          title: 'Rotación Promedio',
          metric: 'avg_turnover_rate',
          refreshInterval: 86400,
          formatting: { suffix: 'x/año', decimals: 1 }
        }
      },
      {
        type: 'alert',
        position: { x: 0, y: 2, width: 6, height: 4 },
        config: {
          title: 'Productos en Stock Crítico',
          metric: 'critical_stock_list',
          refreshInterval: 1800
        }
      },
      {
        type: 'chart',
        position: { x: 6, y: 2, width: 6, height: 4 },
        config: {
          title: 'Valuación por Moneda',
          metric: 'inventory_by_currency',
          refreshInterval: 3600
        }
      },
      {
        type: 'table',
        position: { x: 0, y: 6, width: 12, height: 3 },
        config: {
          title: 'Stock por Almacén',
          metric: 'warehouse_stock_summary',
          refreshInterval: 1800
        }
      },
    ],
    layout: {
      gridColumns: 12,
      gaps: { x: 16, y: 16 },
      responsive: { mobile: 1, tablet: 6, desktop: 12 }
    },
    compatibility: {
      minModules: ['products', 'inventory'],
      suggestedMetrics: ['low_stock_count', 'inventory_value', 'turnover_rate']
    }
  },

  {
    id: 'crm-pipeline',
    name: 'CRM Pipeline',
    category: 'crm',
    description: 'Oportunidades, etapas, actividades, clientes - gestiona tu sales pipeline',
    icon: <Users className="w-6 h-6" />,
    preview: '/templates/crm.png',
    tags: ['sales', 'opportunities', 'customers', 'activities'],
    widgets: [
      {
        type: 'kpi',
        position: { x: 0, y: 0, width: 3, height: 2 },
        config: {
          title: 'Oportunidades Abiertas',
          metric: 'open_opportunities',
          refreshInterval: 600,
          formatting: { decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 3, y: 0, width: 3, height: 2 },
        config: {
          title: 'Valor en Pipeline',
          metric: 'pipeline_value',
          refreshInterval: 600,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 6, y: 0, width: 3, height: 2 },
        config: {
          title: 'Win Rate',
          metric: 'win_rate',
          refreshInterval: 3600,
          formatting: { suffix: '%', decimals: 1 }
        }
      },
      {
        type: 'kpi',
        position: { x: 9, y: 0, width: 3, height: 2 },
        config: {
          title: 'Deal Avg Value',
          metric: 'avg_deal_size',
          refreshInterval: 3600,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'chart',
        position: { x: 0, y: 2, width: 6, height: 4 },
        config: {
          title: 'Pipeline por Etapa',
          metric: 'pipeline_by_stage',
          refreshInterval: 600
        }
      },
      {
        type: 'table',
        position: { x: 6, y: 2, width: 6, height: 4 },
        config: {
          title: 'Top Oportunidades',
          metric: 'top_opportunities',
          refreshInterval: 600
        }
      },
      {
        type: 'table',
        position: { x: 0, y: 6, width: 12, height: 3 },
        config: {
          title: 'Actividades Recientes',
          metric: 'recent_activities',
          refreshInterval: 300
        }
      },
    ],
    layout: {
      gridColumns: 12,
      gaps: { x: 16, y: 16 },
      responsive: { mobile: 1, tablet: 6, desktop: 12 }
    },
    compatibility: {
      minModules: ['sales'],
      suggestedMetrics: ['open_opportunities', 'pipeline_value', 'win_rate']
    }
  },

  {
    id: 'finance-health',
    name: 'Finance & Health',
    category: 'finance',
    description: 'Finanzas, flujo de caja, por cobrar, rentabilidad - salud financiera del negocio',
    icon: <DollarSign className="w-6 h-6" />,
    preview: '/templates/finance.png',
    tags: ['revenue', 'receivables', 'cashflow', 'profitability'],
    widgets: [
      {
        type: 'kpi',
        position: { x: 0, y: 0, width: 3, height: 2 },
        config: {
          title: 'Ingresos Mes',
          metric: 'monthly_revenue',
          refreshInterval: 3600,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 3, y: 0, width: 3, height: 2 },
        config: {
          title: 'Por Cobrar',
          metric: 'accounts_receivable',
          refreshInterval: 3600,
          formatting: { prefix: '$', decimals: 0 }
        }
      },
      {
        type: 'kpi',
        position: { x: 6, y: 0, width: 3, height: 2 },
        config: {
          title: 'Vencidas (%)',
          metric: 'overdue_percentage',
          refreshInterval: 3600,
          formatting: { suffix: '%', decimals: 1 }
        }
      },
      {
        type: 'kpi',
        position: { x: 9, y: 0, width: 3, height: 2 },
        config: {
          title: 'Margen Bruto',
          metric: 'gross_margin_percentage',
          refreshInterval: 3600,
          formatting: { suffix: '%', decimals: 1 }
        }
      },
      {
        type: 'chart',
        position: { x: 0, y: 2, width: 6, height: 4 },
        config: {
          title: 'Ingresos vs Gastos',
          metric: 'revenue_vs_expenses',
          refreshInterval: 3600
        }
      },
      {
        type: 'chart',
        position: { x: 6, y: 2, width: 6, height: 4 },
        config: {
          title: 'Flujo de Caja Proyectado',
          metric: 'cashflow_projection',
          refreshInterval: 86400
        }
      },
      {
        type: 'alert',
        position: { x: 0, y: 6, width: 12, height: 3 },
        config: {
          title: 'Facturas Vencidas',
          metric: 'overdue_invoices',
          refreshInterval: 1800
        }
      },
    ],
    layout: {
      gridColumns: 12,
      gaps: { x: 16, y: 16 },
      responsive: { mobile: 1, tablet: 6, desktop: 12 }
    },
    compatibility: {
      minModules: ['sales'],
      suggestedMetrics: ['monthly_revenue', 'accounts_receivable', 'gross_margin']
    }
  },
];
