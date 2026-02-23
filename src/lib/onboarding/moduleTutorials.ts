// ============================================================
// Module Tutorial Configuration
// Defines the guided tutorial steps for each module.
// Max 4 steps per module, each with a target selector and text.
// ============================================================

export interface TutorialStep {
  /** CSS selector for the element to highlight */
  targetSelector?: string;
  /** Tooltip position relative to target */
  position: 'top' | 'bottom' | 'left' | 'right';
  /** Title of the step */
  title: string;
  /** Short explanation */
  description: string;
}

export interface ModuleTutorialConfig {
  /** Internal module key (matches sidebar/routing) */
  key: string;
  /** Display name */
  label: string;
  /** Category grouping */
  category: string;
  /** Icon name from lucide-react */
  icon: string;
  /** The route to navigate to when starting the tutorial */
  route: string;
  /** Tutorial steps (max 4) */
  steps: TutorialStep[];
}

export const MODULE_TUTORIAL_CATEGORIES = [
  'General',
  'Ventas',
  'Clientes',
  'Inventario',
  'Compras',
  'Finanzas',
  'Operaciones',
  'RRHH',
  'Reportes',
  'Administración',
  'Integraciones',
] as const;

export const MODULE_TUTORIALS: ModuleTutorialConfig[] = [
  // ── General ────────────────────────────────
  {
    key: 'dashboard',
    label: 'Dashboard',
    category: 'General',
    icon: 'LayoutDashboard',
    route: '/app',
    steps: [
      { title: 'Panel principal', description: 'Acá ves un resumen en tiempo real de tu negocio: ventas, clientes y métricas clave.', position: 'bottom' },
      { title: 'Indicadores clave', description: 'Los KPIs te muestran rendimiento diario, mensual y comparativas.', targetSelector: '[data-tour="dashboard-kpis"]', position: 'bottom' },
      { title: 'Gráficos de tendencia', description: 'Los gráficos te ayudan a identificar patrones de venta y crecimiento.', targetSelector: '[data-tour="dashboard-charts"]', position: 'top' },
    ],
  },
  {
    key: 'pos',
    label: 'Punto de Venta',
    category: 'General',
    icon: 'ShoppingCart',
    route: '/pos',
    steps: [
      { title: 'Punto de Venta', description: 'Desde acá hacés ventas rápidas con búsqueda de productos y cobro.', position: 'bottom' },
      { title: 'Buscar productos', description: 'Escribí el nombre o escaneá el código de barras para agregar al carrito.', targetSelector: '[data-tour="pos-search"]', position: 'bottom' },
      { title: 'Carrito de venta', description: 'Los productos agregados aparecen acá con cantidades y totales.', targetSelector: '[data-tour="pos-cart"]', position: 'left' },
      { title: 'Cobrar', description: 'Elegí el método de pago y confirmá la venta.', targetSelector: '[data-tour="pos-checkout"]', position: 'top' },
    ],
  },

  // ── Ventas ────────────────────────────────
  {
    key: 'sales',
    label: 'Ventas',
    category: 'Ventas',
    icon: 'FileText',
    route: '/sales',
    steps: [
      { title: 'Historial de ventas', description: 'Todas tus ventas registradas con filtros por fecha, cliente y estado.', position: 'bottom' },
      { title: 'Detalle de venta', description: 'Hacé clic en una venta para ver productos, pagos y generar comprobante.', targetSelector: '[data-tour="sales-table"]', position: 'bottom' },
      { title: 'Nueva venta', description: 'Podés crear ventas manuales con detalles específicos.', targetSelector: '[data-tour="sales-new"]', position: 'left' },
    ],
  },
  {
    key: 'quotations',
    label: 'Presupuestos',
    category: 'Ventas',
    icon: 'FileCheck',
    route: '/quotations',
    steps: [
      { title: 'Presupuestos', description: 'Creá propuestas comerciales para tus clientes antes de concretar la venta.', position: 'bottom' },
      { title: 'Crear presupuesto', description: 'Agregá productos, aplicá descuentos y enviá el presupuesto por email.', targetSelector: '[data-tour="quotation-new"]', position: 'bottom' },
      { title: 'Convertir a venta', description: 'Un presupuesto aprobado se puede convertir en venta con un clic.', targetSelector: '[data-tour="quotation-convert"]', position: 'bottom' },
    ],
  },
  {
    key: 'delivery_notes',
    label: 'Remitos',
    category: 'Ventas',
    icon: 'Truck',
    route: '/delivery-notes',
    steps: [
      { title: 'Remitos', description: 'Gestioná entregas de mercadería con comprobantes de remito.', position: 'bottom' },
      { title: 'Crear remito', description: 'Asociá productos a una entrega con datos de transporte y destino.', targetSelector: '[data-tour="delivery-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'returns',
    label: 'Devoluciones',
    category: 'Ventas',
    icon: 'TrendingDown',
    route: '/returns',
    steps: [
      { title: 'Devoluciones', description: 'Procesá devoluciones de productos vendidos y ajustá stock automáticamente.', position: 'bottom' },
      { title: 'Nueva devolución', description: 'Seleccioná la venta original y los productos a devolver.', targetSelector: '[data-tour="return-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'reservations',
    label: 'Reservas',
    category: 'Ventas',
    icon: 'Calendar',
    route: '/reservations',
    steps: [
      { title: 'Reservas', description: 'Gestioná reservas de productos o servicios con fechas y estados.', position: 'bottom' },
      { title: 'Crear reserva', description: 'Reservá productos para un cliente con seña o anticipo.', targetSelector: '[data-tour="reservation-new"]', position: 'bottom' },
    ],
  },

  // ── Clientes ────────────────────────────────
  {
    key: 'customers',
    label: 'Clientes',
    category: 'Clientes',
    icon: 'Users',
    route: '/customers',
    steps: [
      { title: 'Lista de clientes', description: 'Acá están todos tus clientes con datos de contacto y estado.', position: 'bottom' },
      { title: 'Agregar cliente', description: 'Registrá clientes con nombre, email, teléfono y datos fiscales.', targetSelector: '[data-tour="customer-new"]', position: 'bottom' },
      { title: 'Detalle del cliente', description: 'Hacé clic en un cliente para ver historial de compras y saldo.', targetSelector: '[data-tour="customer-detail"]', position: 'bottom' },
    ],
  },
  {
    key: 'accounts_receivable',
    label: 'Cuentas Corrientes',
    category: 'Clientes',
    icon: 'Receipt',
    route: '/accounts-receivable',
    steps: [
      { title: 'Cuentas corrientes', description: 'Controlá saldos pendientes de tus clientes en un solo lugar.', position: 'bottom' },
      { title: 'Registrar pago', description: 'Registrá cobros parciales o totales contra la deuda del cliente.', targetSelector: '[data-tour="ar-payment"]', position: 'bottom' },
    ],
  },
  {
    key: 'customer_support',
    label: 'Atención al Cliente',
    category: 'Clientes',
    icon: 'MessageCircle',
    route: '/customer-support',
    steps: [
      { title: 'Atención al cliente', description: 'Gestioná tickets de soporte y consultas de tus clientes.', position: 'bottom' },
      { title: 'Tickets', description: 'Cada consulta se convierte en un ticket con estado y prioridad.', targetSelector: '[data-tour="support-tickets"]', position: 'bottom' },
    ],
  },
  {
    key: 'knowledge_base',
    label: 'Base de Conocimiento',
    category: 'Clientes',
    icon: 'BookOpen',
    route: '/customer-support/knowledge-base',
    steps: [
      { title: 'Base de conocimiento', description: 'Creá artículos de ayuda que tus clientes pueden consultar.', position: 'bottom' },
      { title: 'Crear artículo', description: 'Escribí guías, FAQs o tutoriales para reducir consultas.', targetSelector: '[data-tour="kb-new"]', position: 'bottom' },
    ],
  },

  // ── Inventario ────────────────────────────────
  {
    key: 'products',
    label: 'Productos',
    category: 'Inventario',
    icon: 'Package',
    route: '/products',
    steps: [
      { title: 'Catálogo de productos', description: 'Acá administrás todos tus productos con precios, stock y categorías.', position: 'bottom' },
      { title: 'Agregar producto', description: 'Cargá productos con código, precio, stock mínimo e imágenes.', targetSelector: '[data-tour="product-new"]', position: 'bottom' },
      { title: 'Importar productos', description: 'Podés importar productos masivamente desde un archivo CSV.', targetSelector: '[data-tour="product-import"]', position: 'bottom' },
    ],
  },
  {
    key: 'inventory_alerts',
    label: 'Alertas de Inventario',
    category: 'Inventario',
    icon: 'AlertCircle',
    route: '/inventory-alerts',
    steps: [
      { title: 'Alertas de inventario', description: 'Configurá reglas para recibir notificaciones de stock bajo.', position: 'bottom' },
      { title: 'Crear regla', description: 'Definí umbrales por producto o categoría para alertas automáticas.', targetSelector: '[data-tour="alert-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'warehouses',
    label: 'Depósitos',
    category: 'Inventario',
    icon: 'Warehouse',
    route: '/warehouses',
    steps: [
      { title: 'Depósitos', description: 'Gestioná múltiples ubicaciones de almacenamiento.', position: 'bottom' },
      { title: 'Crear depósito', description: 'Agregá depósitos con nombre, dirección y responsable.', targetSelector: '[data-tour="warehouse-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'warehouse_stock',
    label: 'Stock por Depósito',
    category: 'Inventario',
    icon: 'PackageSearch',
    route: '/warehouse-stock',
    steps: [
      { title: 'Stock por depósito', description: 'Consultá el stock de cada producto en cada depósito.', position: 'bottom' },
      { title: 'Ajustar stock', description: 'Hacé ajustes manuales de stock con motivo registrado.', targetSelector: '[data-tour="stock-adjust"]', position: 'bottom' },
    ],
  },
  {
    key: 'warehouse_transfers',
    label: 'Transferencias',
    category: 'Inventario',
    icon: 'ArrowLeftRight',
    route: '/warehouse-transfers',
    steps: [
      { title: 'Transferencias', description: 'Mové mercadería entre depósitos con registro completo.', position: 'bottom' },
      { title: 'Nueva transferencia', description: 'Seleccioná origen, destino y los productos a transferir.', targetSelector: '[data-tour="transfer-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'stock_reservations',
    label: 'Reservas de Stock',
    category: 'Inventario',
    icon: 'PackageCheck',
    route: '/stock-reservations',
    steps: [
      { title: 'Reservas de stock', description: 'Reservá productos para pedidos pendientes.', position: 'bottom' },
    ],
  },

  // ── Compras ────────────────────────────────
  {
    key: 'purchase_orders',
    label: 'Órdenes de Compra',
    category: 'Compras',
    icon: 'ShoppingBag',
    route: '/purchase-orders',
    steps: [
      { title: 'Órdenes de compra', description: 'Gestioná pedidos a tus proveedores con seguimiento de estado.', position: 'bottom' },
      { title: 'Nueva orden', description: 'Creá una orden con productos, cantidades y precios de compra.', targetSelector: '[data-tour="po-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'purchases',
    label: 'Historial de Compras',
    category: 'Compras',
    icon: 'Receipt',
    route: '/purchases',
    steps: [
      { title: 'Historial de compras', description: 'Todas las compras registradas con datos de proveedor y montos.', position: 'bottom' },
    ],
  },
  {
    key: 'purchase_reception',
    label: 'Recepción de Mercadería',
    category: 'Compras',
    icon: 'PackageOpen',
    route: '/purchase-reception',
    steps: [
      { title: 'Recepción', description: 'Registrá la llegada de mercadería y actualiza stock automáticamente.', position: 'bottom' },
      { title: 'Recibir orden', description: 'Verificá cantidades recibidas contra la orden de compra.', targetSelector: '[data-tour="reception-receive"]', position: 'bottom' },
    ],
  },
  {
    key: 'purchase_returns',
    label: 'Devoluciones a Proveedores',
    category: 'Compras',
    icon: 'TrendingDown',
    route: '/purchase-returns',
    steps: [
      { title: 'Devoluciones a proveedores', description: 'Devolvé mercadería defectuosa o sobrante a tus proveedores.', position: 'bottom' },
    ],
  },
  {
    key: 'suppliers',
    label: 'Proveedores',
    category: 'Compras',
    icon: 'Truck',
    route: '/suppliers',
    steps: [
      { title: 'Proveedores', description: 'Administrá tu base de proveedores con datos de contacto.', position: 'bottom' },
      { title: 'Agregar proveedor', description: 'Registrá proveedores con nombre, CUIT, condiciones de pago.', targetSelector: '[data-tour="supplier-new"]', position: 'bottom' },
    ],
  },

  // ── Finanzas ────────────────────────────────
  {
    key: 'bank_accounts',
    label: 'Cuentas Bancarias',
    category: 'Finanzas',
    icon: 'Building2',
    route: '/bank-accounts',
    steps: [
      { title: 'Cuentas bancarias', description: 'Registrá tus cuentas para trackear movimientos y saldos.', position: 'bottom' },
      { title: 'Agregar cuenta', description: 'Cargá banco, número de cuenta, CBU y tipo de cuenta.', targetSelector: '[data-tour="bank-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'bank_movements',
    label: 'Movimientos Bancarios',
    category: 'Finanzas',
    icon: 'DollarSign',
    route: '/bank-movements',
    steps: [
      { title: 'Movimientos bancarios', description: 'Registrá ingresos, egresos y transferencias entre cuentas.', position: 'bottom' },
    ],
  },
  {
    key: 'card_movements',
    label: 'Movimientos de Tarjetas',
    category: 'Finanzas',
    icon: 'CreditCard',
    route: '/card-movements',
    steps: [
      { title: 'Movimientos de tarjetas', description: 'Controlá ventas con tarjeta, cupones y liquidaciones.', position: 'bottom' },
    ],
  },
  {
    key: 'retentions',
    label: 'Retenciones',
    category: 'Finanzas',
    icon: 'Calculator',
    route: '/retentions',
    steps: [
      { title: 'Retenciones', description: 'Gestioná retenciones impositivas aplicadas y sufridas.', position: 'bottom' },
    ],
  },

  // ── Operaciones ────────────────────────────────
  {
    key: 'technical_services',
    label: 'Servicios Técnicos',
    category: 'Operaciones',
    icon: 'Wrench',
    route: '/technical-services',
    steps: [
      { title: 'Servicios técnicos', description: 'Gestioná reparaciones y órdenes de servicio técnico.', position: 'bottom' },
      { title: 'Crear servicio', description: 'Registrá equipo, diagnóstico, presupuesto y seguimiento.', targetSelector: '[data-tour="service-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'cash_register',
    label: 'Gestión de Caja',
    category: 'Operaciones',
    icon: 'Banknote',
    route: '/cash-register',
    steps: [
      { title: 'Gestión de caja', description: 'Abrí y cerrá cajas con control de efectivo y movimientos.', position: 'bottom' },
      { title: 'Abrir caja', description: 'Iniciá una caja con monto inicial y registrá ingresos/egresos.', targetSelector: '[data-tour="cash-open"]', position: 'bottom' },
      { title: 'Cierre de caja', description: 'Cerrá la caja con conteo final y reporte de diferencias.', targetSelector: '[data-tour="cash-close"]', position: 'bottom' },
    ],
  },
  {
    key: 'expenses',
    label: 'Gastos',
    category: 'Operaciones',
    icon: 'Receipt',
    route: '/expenses',
    steps: [
      { title: 'Gastos', description: 'Controlá todos los gastos operativos de tu negocio.', position: 'bottom' },
      { title: 'Registrar gasto', description: 'Cargá gastos con categoría, proveedor y comprobante.', targetSelector: '[data-tour="expense-new"]', position: 'bottom' },
    ],
  },
  {
    key: 'checks',
    label: 'Cheques',
    category: 'Operaciones',
    icon: 'FileText',
    route: '/checks',
    steps: [
      { title: 'Cheques', description: 'Administrá cheques propios y de terceros con vencimientos.', position: 'bottom' },
    ],
  },
  {
    key: 'promotions',
    label: 'Promociones',
    category: 'Operaciones',
    icon: 'Tag',
    route: '/promotions',
    steps: [
      { title: 'Promociones', description: 'Creá descuentos y ofertas especiales para tus productos.', position: 'bottom' },
      { title: 'Crear promoción', description: 'Definí tipo de descuento, productos incluidos y vigencia.', targetSelector: '[data-tour="promo-new"]', position: 'bottom' },
    ],
  },

  // ── RRHH ────────────────────────────────
  {
    key: 'payroll',
    label: 'Liquidaciones',
    category: 'RRHH',
    icon: 'Calculator',
    route: '/payroll',
    steps: [
      { title: 'Liquidaciones', description: 'Generá recibos de sueldo y gestioná pagos a empleados.', position: 'bottom' },
    ],
  },
  {
    key: 'commissions',
    label: 'Comisiones',
    category: 'RRHH',
    icon: 'TrendingUp',
    route: '/commissions',
    steps: [
      { title: 'Comisiones', description: 'Calculá comisiones por ventas para tu equipo comercial.', position: 'bottom' },
    ],
  },
  {
    key: 'employees',
    label: 'Empleados',
    category: 'RRHH',
    icon: 'UserCheck',
    route: '/employees',
    steps: [
      { title: 'Empleados', description: 'Gestioná el equipo con roles, permisos y datos laborales.', position: 'bottom' },
      { title: 'Agregar empleado', description: 'Invitá empleados por email y asignales un rol en el sistema.', targetSelector: '[data-tour="employee-new"]', position: 'bottom' },
    ],
  },

  // ── Reportes ────────────────────────────────
  {
    key: 'reports',
    label: 'Reportes',
    category: 'Reportes',
    icon: 'BarChart3',
    route: '/reports',
    steps: [
      { title: 'Reportes', description: 'Analizá el rendimiento de tu negocio con reportes visuales.', position: 'bottom' },
      { title: 'Filtros', description: 'Filtrá por período, categoría o tipo de reporte.', targetSelector: '[data-tour="report-filters"]', position: 'bottom' },
    ],
  },
  {
    key: 'accountant_reports',
    label: 'Reportes Contador',
    category: 'Reportes',
    icon: 'Shield',
    route: '/accountant-reports',
    steps: [
      { title: 'Reportes Contador', description: 'Reportes especiales para tu contador: IVA, retenciones, libro mayor.', position: 'bottom' },
    ],
  },

  // ── Administración ────────────────────────────────
  {
    key: 'settings',
    label: 'Configuración',
    category: 'Administración',
    icon: 'Settings',
    route: '/settings',
    steps: [
      { title: 'Configuración', description: 'Ajustá los parámetros generales de tu empresa.', position: 'bottom' },
      { title: 'Datos de empresa', description: 'Editá nombre, logo, datos fiscales y preferencias.', targetSelector: '[data-tour="settings-company"]', position: 'bottom' },
    ],
  },
  {
    key: 'pos_afip',
    label: 'Puntos de Venta AFIP',
    category: 'Administración',
    icon: 'Store',
    route: '/pos-points',
    steps: [
      { title: 'Puntos de Venta AFIP', description: 'Configurá los puntos de venta habilitados en AFIP.', position: 'bottom' },
    ],
  },
  {
    key: 'audit_logs',
    label: 'Auditoría',
    category: 'Administración',
    icon: 'Shield',
    route: '/audit-logs',
    steps: [
      { title: 'Auditoría', description: 'Revisá todas las acciones realizadas en el sistema.', position: 'bottom' },
    ],
  },
  {
    key: 'access_logs',
    label: 'Logs de Acceso',
    category: 'Administración',
    icon: 'Activity',
    route: '/access-logs',
    steps: [
      { title: 'Logs de acceso', description: 'Controlá quién accedió al sistema, cuándo y desde dónde.', position: 'bottom' },
    ],
  },
  {
    key: 'monthly_closing',
    label: 'Cierre Mensual',
    category: 'Administración',
    icon: 'Calendar',
    route: '/monthly-closing',
    steps: [
      { title: 'Cierre mensual', description: 'Realizá el cierre contable del período con validaciones.', position: 'bottom' },
    ],
  },
  {
    key: 'bulk_operations',
    label: 'Operaciones Masivas',
    category: 'Administración',
    icon: 'Zap',
    route: '/bulk-operations',
    steps: [
      { title: 'Operaciones masivas', description: 'Realizá acciones en lote: actualizaciones de precios, stock, etc.', position: 'bottom' },
    ],
  },
  {
    key: 'notifications',
    label: 'Notificaciones',
    category: 'Administración',
    icon: 'Bell',
    route: '/notification-settings',
    steps: [
      { title: 'Notificaciones', description: 'Configurá qué alertas recibís y por qué canal.', position: 'bottom' },
    ],
  },

  // ── Integraciones ────────────────────────────────
  {
    key: 'integrations',
    label: 'Integraciones',
    category: 'Integraciones',
    icon: 'Plug',
    route: '/integrations',
    steps: [
      { title: 'Integraciones', description: 'Conectá servicios externos: email, WhatsApp, Google y más.', position: 'bottom' },
    ],
  },
  {
    key: 'afip',
    label: 'Facturación AFIP',
    category: 'Integraciones',
    icon: 'Receipt',
    route: '/afip',
    steps: [
      { title: 'Facturación AFIP', description: 'Emití facturas electrónicas válidas ante AFIP.', position: 'bottom' },
      { title: 'Configurar AFIP', description: 'Cargá tu certificado digital y habilitá la facturación.', targetSelector: '[data-tour="afip-config"]', position: 'bottom' },
    ],
  },
  {
    key: 'ai_assistant',
    label: 'Asistente de IA',
    category: 'Integraciones',
    icon: 'Sparkles',
    route: '/ai-assistant',
    steps: [
      { title: 'Asistente de IA', description: 'Hacé preguntas sobre tu negocio y recibí respuestas inteligentes.', position: 'bottom' },
      { title: 'Chat', description: 'Escribí en lenguaje natural y el asistente analiza tus datos.', targetSelector: '[data-tour="ai-chat"]', position: 'bottom' },
    ],
  },
];

/** Get tutorials grouped by category */
export function getTutorialsByCategory(): Map<string, ModuleTutorialConfig[]> {
  const grouped = new Map<string, ModuleTutorialConfig[]>();
  for (const cat of MODULE_TUTORIAL_CATEGORIES) {
    const tutorials = MODULE_TUTORIALS.filter((t) => t.category === cat);
    if (tutorials.length > 0) {
      grouped.set(cat, tutorials);
    }
  }
  return grouped;
}

/** Get a single module tutorial config by key */
export function getTutorialByKey(key: string): ModuleTutorialConfig | undefined {
  return MODULE_TUTORIALS.find((t) => t.key === key);
}
