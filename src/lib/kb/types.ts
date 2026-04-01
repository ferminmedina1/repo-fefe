// ============================================================
// Knowledge Base Types
// ============================================================

export type KBCategory = 
  | 'dashboard'
  | 'sales' 
  | 'products'
  | 'customers'
  | 'inventory'
  | 'settings'
  | 'accounting'
  | 'general';

export interface KBArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  category: KBCategory;
  tags: string[];
  views: number;
  helpful: number;
  created_at: string;
  updated_at: string;
  readTime: number; // en minutos
}

export interface KBCategory {
  key: KBCategory;
  label: string;
  description: string;
  icon: string;
  articles: number;
}

export const KB_CATEGORIES: Record<KBCategory, { label: string; description: string; icon: string }> = {
  dashboard: {
    label: 'Dashboard',
    description: 'Panel de control y métricas',
    icon: 'LayoutDashboard',
  },
  sales: {
    label: 'Ventas',
    description: 'Gestión de ventas y presupuestos',
    icon: 'TrendingUp',
  },
  products: {
    label: 'Productos',
    description: 'Catálogo y gestión de inventario',
    icon: 'Package',
  },
  customers: {
    label: 'Clientes',
    description: 'Gestión de cartera y cuentas',
    icon: 'Users',
  },
  inventory: {
    label: 'Inventario',
    description: 'Stock y almacenes',
    icon: 'Warehouse',
  },
  settings: {
    label: 'Configuración',
    description: 'Preferencias y setup',
    icon: 'Settings',
  },
  accounting: {
    label: 'Contabilidad',
    description: 'Reportes financieros',
    icon: 'BarChart3',
  },
  general: {
    label: 'General',
    description: 'Preguntas frecuentes',
    icon: 'HelpCircle',
  },
};
