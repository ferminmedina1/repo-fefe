// ============================================================
// Tutorial Configuration - Guías paso a paso por módulo
// ============================================================

import { ModuleTutorial } from './types';

export const TUTORIAL_MODULES: ModuleTutorial[] = [
  // ── Dashboard ────────────────────────────────
  {
    moduleId: 'dashboard',
    moduleName: 'Dashboard Principal',
    description: 'Conoce tu panel de control y las métricas principales',
    category: 'Inicio',
    estimatedTime: 3,
    icon: 'LayoutDashboard',
    steps: [
      {
        id: 'dashboard-1',
        title: '👋 Bienvenido a tu Dashboard',
        description: 'Este es tu panel de control principal. Aquí verás un resumen de todas tus ventas, clientes e inventario en tiempo real.',
        position: 'bottom',
        action: 'Observa los números en las tarjetas superiores',
      },
      {
        id: 'dashboard-2',
        target: '[data-tutorial="kpis"]',
        title: '📊 Indicadores Clave (KPIs)',
        description: 'Estas tarjetas muestran tus métricas principales: ventas del día, ingresos totales y órdenes pendientes.',
        position: 'bottom',
        action: 'Haz clic en una tarjeta para ver más detalles',
        duration: 5,
      },
      {
        id: 'dashboard-3',
        target: '[data-tutorial="chart-sales"]',
        title: '📈 Gráfico de Ventas',
        description: 'El gráfico te muestra las tendencias de ventas a lo largo del mes. Puedes pasar el mouse para ver valores exactos.',
        position: 'top',
        action: 'Mueve el cursor sobre el gráfico',
      },
      {
        id: 'dashboard-4',
        target: '[data-tutorial="quick-actions"]',
        title: '⚡ Acciones Rápidas',
        description: 'Aquí encuentras botones para crear rápidamente una nueva venta, cliente o producto.',
        position: 'top',
        action: 'Puedes hacer clic en cualquier botón para comenzar',
      },
    ],
  },

  // ── Ventas ────────────────────────────────
  {
    moduleId: 'sales',
    moduleName: 'Módulo de Ventas',
    description: 'Aprende a crear y gestionar tus ventas',
    category: 'Ventas',
    estimatedTime: 5,
    icon: 'ShoppingCart',
    steps: [
      {
        id: 'sales-1',
        title: '🛒 Gestión de Ventas',
        description: 'En este módulo puedes crear nuevas ventas, ver el historial y gestionar tus pedidos.',
        position: 'bottom',
        action: 'Explora los botones principales',
      },
      {
        id: 'sales-2',
        target: '[data-tutorial="btn-create-sale"]',
        title: '➕ Crear Nueva Venta',
        description: 'Haz clic aquí para crear una nueva venta. Se abrirá un formulario donde podrás agregar productos y cliente.',
        position: 'bottom',
        action: 'Haz clic en el botón "Nueva Venta"',
        duration: 3,
      },
      {
        id: 'sales-3',
        target: '[data-tutorial="sales-table"]',
        title: '📋 Historial de Ventas',
        description: 'Aquí están todas tus ventas. Puedes buscar, filtrar y ver detalles de cada una.',
        position: 'top',
        action: 'Haz clic en una venta para ver sus detalles',
      },
      {
        id: 'sales-4',
        target: '[data-tutorial="sales-filters"]',
        title: '🔍 Filtros y Búsqueda',
        description: 'Usa estos filtros para encontrar ventas por cliente, fecha o estado (pendiente, completada, cancelada).',
        position: 'bottom',
        action: 'Prueba filtrar por estado o cliente',
      },
    ],
  },

  // ── Productos ────────────────────────────────
  {
    moduleId: 'products',
    moduleName: 'Gestión de Productos',
    description: 'Administra tu catálogo de productos e inventario',
    category: 'Inventario',
    estimatedTime: 5,
    icon: 'Package',
    steps: [
      {
        id: 'products-1',
        title: '📦 Tu Catálogo de Productos',
        description: 'Aquí puedes ver, crear y editar todos tus productos, precios y stock.',
        position: 'bottom',
        action: 'Observa la lista de productos',
      },
      {
        id: 'products-2',
        target: '[data-tutorial="btn-create-product"]',
        title: '➕ Agregar Nuevo Producto',
        description: 'Haz clic aquí para crear un nuevo producto. Necesitarás nombre, precio, código y stock inicial.',
        position: 'bottom',
        action: 'Haz clic en "Nuevo Producto"',
        duration: 3,
      },
      {
        id: 'products-3',
        target: '[data-tutorial="product-table"]',
        title: '📊 Información del Producto',
        description: 'En la tabla ves: nombre, código, precio, stock actual y si hay alertas de stock bajo.',
        position: 'top',
        action: 'Haz clic en un producto para editar',
      },
      {
        id: 'products-4',
        target: '[data-tutorial="stock-alert"]',
        title: '⚠️ Alertas de Stock',
        description: 'Los productos en rojo tienen stock bajo. Configura stock mínimo para ser alertado automáticamente.',
        position: 'left',
        action: 'Revisa si hay productos en alerta',
      },
    ],
  },

  // ── Clientes ────────────────────────────────
  {
    moduleId: 'customers',
    moduleName: 'Base de Clientes',
    description: 'Administra y conoce mejor a tus clientes',
    category: 'Clientes',
    estimatedTime: 4,
    icon: 'Users',
    steps: [
      {
        id: 'customers-1',
        title: '👥 Base de Clientes',
        description: 'Aquí está información de todos tus clientes: contacto, dirección, historial de compras y deuda.',
        position: 'bottom',
        action: 'Observa la lista de clientes',
      },
      {
        id: 'customers-2',
        target: '[data-tutorial="btn-create-customer"]',
        title: '➕ Agregar Nuevo Cliente',
        description: 'Haz clic para crear un nuevo cliente. Necesitarás nombre, teléfono, email y dirección básica.',
        position: 'bottom',
        action: 'Haz clic en "Nuevo Cliente"',
        duration: 3,
      },
      {
        id: 'customers-3',
        target: '[data-tutorial="customer-card"]',
        title: '🎯 Perfil del Cliente',
        description: 'Acá ves el resumen: datos de contacto, total gastado, saldo pendiente y últimas compras.',
        position: 'right',
        action: 'Haz clic en un cliente para ver perfil completo',
      },
      {
        id: 'customers-4',
        target: '[data-tutorial="customer-filters"]',
        title: '🔍 Búsqueda y Filtros',
        description: 'Usa la barra para buscar por nombre, email o teléfono.',
        position: 'bottom',
        action: 'Escribe el nombre de un cliente',
      },
    ],
  },

  // ── Inventario ────────────────────────────────
  {
    moduleId: 'inventory',
    moduleName: 'Control de Inventario',
    description: 'Monitorea stock y recibe alertas automáticas',
    category: 'Inventario',
    estimatedTime: 4,
    icon: 'Warehouse',
    steps: [
      {
        id: 'inventory-1',
        title: '📦 Centro de Control de Stock',
        description: 'Este módulo te muestra en tiempo real qué productos tiene bajo stock y qué necesitas reponer.',
        position: 'bottom',
        action: 'Observa qué productos tienen alertas',
      },
      {
        id: 'inventory-2',
        target: '[data-tutorial="alerts-panel"]',
        title: '🚨 Panel de Alertas',
        description: 'Los productos en esta sección tienen stock por debajo del mínimo establecido.',
        position: 'bottom',
        action: 'Revisa qué necesita reposición',
        duration: 3,
      },
      {
        id: 'inventory-3',
        target: '[data-tutorial="stock-levels"]',
        title: '📊 Niveles de Stock',
        description: 'Aquí ves el stock actual vs. stock mínimo. En rojo products que necesitan urgente reposición.',
        position: 'top',
        action: 'Observa los niveles por producto',
      },
      {
        id: 'inventory-4',
        target: '[data-tutorial="reorder-btn"]',
        title: '📝 Crear Orden de Recompra',
        description: 'Selecciona productos y crea una orden de compra directamente desde aquí.',
        position: 'left',
        action: 'Haz clic para crear una recompra',
      },
    ],
  },

  // ── Configuración ────────────────────────────────
  {
    moduleId: 'settings',
    moduleName: 'Configuración de Empresa',
    description: 'Personaliza tu cuenta y preferencias',
    category: 'Administración',
    estimatedTime: 3,
    icon: 'Settings',
    steps: [
      {
        id: 'settings-1',
        title: '⚙️ Configuración General',
        description: 'Aquí configuras datos de tu empresa, logo, nombre y datos fiscales.',
        position: 'bottom',
        action: 'Observa las opciones disponibles',
      },
      {
        id: 'settings-2',
        target: '[data-tutorial="company-info"]',
        title: '🏢 Datos de la Empresa',
        description: 'Nombre, CUIT, razón social y datos de contacto que aparecen en facturas y documentos.',
        position: 'bottom',
        action: 'Actualiza si es necesario',
        duration: 3,
      },
      {
        id: 'settings-3',
        target: '[data-tutorial="payment-methods"]',
        title: '💳 Métodos de Pago',
        description: 'Aquí habilitas los métodos de pago que aceptas: efectivo, tarjeta, transferencia, etc.',
        position: 'top',
        action: 'Haz clic para ver y configurar métodos',
      },
    ],
  },
];

export const getTutorialByModuleId = (moduleId: string): ModuleTutorial | undefined => {
  return TUTORIAL_MODULES.find(t => t.moduleId === moduleId);
};

export const getTutorialsByCategory = (category: string): ModuleTutorial[] => {
  return TUTORIAL_MODULES.filter(t => t.category === category);
};
