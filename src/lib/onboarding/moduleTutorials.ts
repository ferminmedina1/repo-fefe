// ============================================================
// Module Tutorial Configuration
// Defines the guided tutorial steps for each module.
// Each step includes description + actionable next steps.
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
  /** Actionable next steps the user should take */
  nextSteps?: string[];
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
  /** Tutorial steps */
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
      {
        title: 'Tu panel principal',
        description: 'Acá ves un resumen en tiempo real de tu negocio: ventas, clientes y métricas clave.',
        position: 'bottom',
        nextSteps: [
          'Revisá los KPIs de ventas del día y del mes',
          'Observá el margen y los cobros pendientes',
          'Usá los filtros de fecha para comparar períodos',
        ],
      },
      {
        title: 'Indicadores clave (KPIs)',
        description: 'Las tarjetas superiores te muestran rendimiento diario, mensual y comparativas con períodos anteriores.',
        targetSelector: '[data-tutorial-section="kpis"]',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en un KPI para ver el detalle ampliado',
          'Compará valores vs. el mes anterior',
          'Identificá tendencias de crecimiento o caída',
        ],
      },
      {
        title: 'Gráficos de tendencia',
        description: 'Los gráficos te ayudan a identificar patrones de venta, rentabilidad y crecimiento a lo largo del tiempo.',
        position: 'top',
        nextSteps: [
          'Pasá el mouse sobre los gráficos para ver valores exactos',
          'Cambiá el rango de fechas para ver distintos períodos',
          'Identificá los días/semanas con mejor performance',
        ],
      },
      {
        title: 'Alertas y accesos rápidos',
        description: 'Debajo encontrás alertas de stock bajo, ventas recientes y accesos directos a módulos frecuentes.',
        position: 'top',
        nextSteps: [
          'Revisá si hay alertas de stock bajo pendientes',
          'Accedé rápidamente a las ventas del día',
          'Explorá el menú lateral para todos los módulos',
        ],
      },
    ],
  },
  {
    key: 'pos',
    label: 'Punto de Venta',
    category: 'General',
    icon: 'ShoppingCart',
    route: '/pos',
    steps: [
      {
        title: 'Tu caja registradora digital',
        description: 'Desde acá hacés ventas rápidas. Buscá productos, armá el carrito y cobrá en segundos.',
        position: 'bottom',
        nextSteps: [
          'Verificá que tengas productos cargados antes de vender',
          'Asegurate de tener una caja abierta (Gestión de Caja)',
          'Probá buscar un producto por nombre o código',
        ],
      },
      {
        title: 'Buscar y agregar productos',
        description: 'Escribí el nombre, código o escaneá el código de barras. Los productos aparecen al instante.',
        position: 'bottom',
        nextSteps: [
          'Escribí al menos 2 letras para buscar',
          'Hacé clic en un resultado para agregarlo al carrito',
          'Ajustá la cantidad directamente en el carrito',
        ],
      },
      {
        title: 'Carrito y descuentos',
        description: 'Los productos agregados aparecen con cantidades, precios y subtotales. Podés aplicar descuentos.',
        position: 'left',
        nextSteps: [
          'Cambiá cantidades con los botones + y −',
          'Aplicá un descuento porcentual o fijo por línea',
          'Verificá el total antes de cobrar',
        ],
      },
      {
        title: 'Cobrar la venta',
        description: 'Elegí uno o más medios de pago (efectivo, tarjeta, transferencia) y confirmá la operación.',
        position: 'top',
        nextSteps: [
          'Seleccioná el medio de pago principal',
          'Ingresá el monto recibido para calcular el vuelto',
          'Confirmá y generá el comprobante o ticket',
        ],
      },
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
      {
        title: 'Historial de ventas',
        description: 'Todas tus ventas registradas, ordenadas por fecha. Filtrá por cliente, estado o período.',
        position: 'bottom',
        nextSteps: [
          'Usá los filtros de fecha para acotar resultados',
          'Buscá por nombre de cliente o número de venta',
          'Exportá la lista a CSV o PDF desde el botón de acciones',
        ],
      },
      {
        title: 'Detalle de una venta',
        description: 'Hacé clic en cualquier venta para ver productos vendidos, pagos aplicados y estado del comprobante.',
        position: 'bottom',
        nextSteps: [
          'Revisá los ítems y cantidades de cada venta',
          'Verificá el estado del pago (cobrado, pendiente, parcial)',
          'Generá o reimprimí el comprobante desde el detalle',
        ],
      },
      {
        title: 'Crear venta manual',
        description: 'Además del POS, podés crear ventas manuales con todos los detalles: cliente, productos, condiciones.',
        position: 'left',
        nextSteps: [
          'Hacé clic en "Nueva Venta" para iniciar',
          'Seleccioná un cliente existente o creá uno nuevo',
          'Agregá productos, definí precios y confirmá',
        ],
      },
      {
        title: 'Anular venta',
        description: 'Si necesitás anular una venta, podés hacerlo desde el detalle. El stock se revierte automáticamente.',
        position: 'top',
        nextSteps: [
          'Abrí el detalle de la venta a anular',
          'Usá el botón "Anular" e indicá el motivo',
          'Verificá que el stock se haya revertido correctamente',
        ],
      },
    ],
  },
  {
    key: 'quotations',
    label: 'Presupuestos',
    category: 'Ventas',
    icon: 'FileCheck',
    route: '/quotations',
    steps: [
      {
        title: 'Gestión de presupuestos',
        description: 'Creá propuestas comerciales para tus clientes antes de concretar la venta.',
        position: 'bottom',
        nextSteps: [
          'Revisá los presupuestos pendientes de aprobación',
          'Filtrá por estado: borrador, enviado, aprobado, vencido',
          'Controlá la fecha de vencimiento de cada propuesta',
        ],
      },
      {
        title: 'Crear presupuesto',
        description: 'Agregá productos, aplicá descuentos, definí condiciones de pago y enviá por email al cliente.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el cliente destinatario',
          'Agregá los productos con cantidades y precios',
          'Definí validez, condiciones de pago y notas',
        ],
      },
      {
        title: 'Enviar y dar seguimiento',
        description: 'Enviá el presupuesto por email o descargá como PDF. Seguí el estado hasta la aprobación.',
        position: 'bottom',
        nextSteps: [
          'Usá "Enviar por email" para compartirlo directo',
          'Descargá el PDF para enviar por WhatsApp o imprimir',
          'Hacé seguimiento cambiando el estado manualmente',
        ],
      },
      {
        title: 'Convertir a venta',
        description: 'Un presupuesto aprobado se convierte en venta con un clic — sin volver a cargar todos los datos.',
        position: 'bottom',
        nextSteps: [
          'Abrí un presupuesto aprobado',
          'Usá "Convertir a Venta" para generar la operación',
          'Revisá y confirmá los datos de la venta generada',
        ],
      },
    ],
  },
  {
    key: 'delivery_notes',
    label: 'Remitos',
    category: 'Ventas',
    icon: 'Truck',
    route: '/delivery-notes',
    steps: [
      {
        title: 'Remitos de entrega',
        description: 'Gestioná entregas de mercadería con comprobantes de remito vinculados a ventas.',
        position: 'bottom',
        nextSteps: [
          'Revisá los remitos pendientes de entrega',
          'Filtrá por fecha, cliente o estado de entrega',
          'Verificá que cada remito tenga la venta asociada',
        ],
      },
      {
        title: 'Crear remito',
        description: 'Asociá productos a una entrega con datos de transporte, destino y responsable.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná la venta de origen',
          'Elegí los productos y cantidades a entregar',
          'Completá datos de transporte y dirección de destino',
        ],
      },
      {
        title: 'Imprimir y entregar',
        description: 'Generá el comprobante impreso para que el transportista lleve una copia firmada.',
        position: 'top',
        nextSteps: [
          'Descargá o imprimí el remito en PDF',
          'Marcá el remito como "Entregado" al confirmar recepción',
          'Controlá el historial de entregas por cliente',
        ],
      },
    ],
  },
  {
    key: 'returns',
    label: 'Devoluciones',
    category: 'Ventas',
    icon: 'TrendingDown',
    route: '/returns',
    steps: [
      {
        title: 'Procesá devoluciones',
        description: 'Registrá devoluciones de productos vendidos. El stock se ajusta automáticamente.',
        position: 'bottom',
        nextSteps: [
          'Revisá el historial de devoluciones realizadas',
          'Verificá que el stock se haya revertido correctamente',
          'Controlá el motivo de cada devolución',
        ],
      },
      {
        title: 'Nueva devolución',
        description: 'Seleccioná la venta original, elegí los productos a devolver y registrá el motivo.',
        position: 'bottom',
        nextSteps: [
          'Buscá la venta por número o cliente',
          'Seleccioná los ítems y cantidades a devolver',
          'Indicá el motivo: defecto, error, cambio, etc.',
        ],
      },
      {
        title: 'Nota de crédito',
        description: 'Al confirmar la devolución, podés generar una nota de crédito para el cliente.',
        position: 'top',
        nextSteps: [
          'Revisá el monto de la nota de crédito generada',
          'Decidí si se aplica como descuento o reembolso',
          'Verificá el impacto en la cuenta corriente del cliente',
        ],
      },
    ],
  },
  {
    key: 'reservations',
    label: 'Reservas',
    category: 'Ventas',
    icon: 'Calendar',
    route: '/reservations',
    steps: [
      {
        title: 'Gestión de reservas',
        description: 'Gestioná reservas de productos con señas, fechas de retiro y estados de seguimiento.',
        position: 'bottom',
        nextSteps: [
          'Revisá las reservas activas y próximas a vencer',
          'Filtrá por cliente, producto o estado',
          'Controlá las señas recibidas por cada reserva',
        ],
      },
      {
        title: 'Crear reserva',
        description: 'Reservá productos para un cliente con seña o anticipo parcial.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el cliente y los productos a reservar',
          'Definí la fecha estimada de retiro',
          'Registrá el monto de la seña si corresponde',
        ],
      },
      {
        title: 'Convertir a venta',
        description: 'Cuando el cliente retira, convertí la reserva en venta descontando la seña.',
        position: 'top',
        nextSteps: [
          'Abrí la reserva cuando el cliente venga a retirar',
          'Convertí a venta para completar la operación',
          'El sistema descuenta automáticamente la seña pagada',
        ],
      },
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
      {
        title: 'Tu base de clientes',
        description: 'Acá están todos tus clientes con datos de contacto, fiscal y estado de cuenta.',
        position: 'bottom',
        nextSteps: [
          'Revisá la lista completa de clientes activos',
          'Usá la búsqueda para encontrar un cliente rápidamente',
          'Filtrá por estado, localidad o tipo de cliente',
        ],
      },
      {
        title: 'Agregar nuevo cliente',
        description: 'Registrá clientes con todos los datos: nombre, CUIT/DNI, email, teléfono y dirección.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Nuevo Cliente" para empezar',
          'Completá nombre, documento y datos de contacto',
          'Definí la condición fiscal (Responsable Inscripto, Monotributo, etc.)',
        ],
      },
      {
        title: 'Perfil del cliente',
        description: 'Hacé clic en un cliente para ver su historial de compras, saldo en cuenta corriente y datos completos.',
        position: 'bottom',
        nextSteps: [
          'Revisá el historial de compras del cliente',
          'Verificá si tiene saldo pendiente en cuenta corriente',
          'Editá los datos desde el botón de edición del perfil',
        ],
      },
      {
        title: 'Exportar y analizar',
        description: 'Exportá tu base de clientes a CSV para análisis externo o backup.',
        position: 'top',
        nextSteps: [
          'Usá el botón "Exportar" para descargar la lista',
          'Analizá la distribución de clientes por localidad',
          'Identificá clientes con mayor volumen de compras',
        ],
      },
    ],
  },
  {
    key: 'accounts_receivable',
    label: 'Cuentas Corrientes',
    category: 'Clientes',
    icon: 'Receipt',
    route: '/accounts-receivable',
    steps: [
      {
        title: 'Control de deudas',
        description: 'Controlá saldos pendientes de todos tus clientes en un solo lugar.',
        position: 'bottom',
        nextSteps: [
          'Revisá los clientes con saldo mayor pendiente',
          'Filtrá por antigüedad de la deuda',
          'Identificá clientes que necesitan seguimiento de cobro',
        ],
      },
      {
        title: 'Registrar cobro',
        description: 'Registrá cobros parciales o totales contra la deuda del cliente.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el cliente y las facturas a cancelar',
          'Ingresá el monto cobrado y el medio de pago',
          'El saldo se actualiza automáticamente al confirmar',
        ],
      },
      {
        title: 'Estado de cuenta',
        description: 'Generá un resumen de estado de cuenta para enviar al cliente.',
        position: 'top',
        nextSteps: [
          'Abrí el detalle del cliente',
          'Generá el estado de cuenta en PDF',
          'Envialo por email o compartilo por WhatsApp',
        ],
      },
    ],
  },
  {
    key: 'customer_support',
    label: 'Atención al Cliente',
    category: 'Clientes',
    icon: 'MessageCircle',
    route: '/customer-support',
    steps: [
      {
        title: 'Centro de soporte',
        description: 'Gestioná tickets de soporte y consultas de tus clientes desde un solo lugar.',
        position: 'bottom',
        nextSteps: [
          'Revisá los tickets abiertos pendientes de respuesta',
          'Priorizá por urgencia: alta, media, baja',
          'Filtrá por estado: nuevo, en progreso, resuelto',
        ],
      },
      {
        title: 'Métricas de soporte',
        description: 'Estas tarjetas te muestran el resumen de tickets abiertos, en progreso, resueltos y totales.',
        targetSelector: '[data-tutorial-section="stats"]',
        position: 'bottom',
        nextSteps: [
          'Revisá el tiempo promedio de primera respuesta',
          'Analizá cuántos tickets se resuelven por día',
          'Identificá las consultas más frecuentes para crear FAQs',
        ],
      },
      {
        title: 'Gestionar tickets',
        description: 'Cada consulta se convierte en un ticket con estado, prioridad y asignación. Seleccioná un ticket de la lista para responder.',
        targetSelector: '[data-tutorial-section="tickets"]',
        position: 'top',
        nextSteps: [
          'Asigná un ticket a un miembro del equipo',
          'Respondé directamente desde la vista de ticket',
          'Cambiá el estado a "Resuelto" cuando se cierre',
        ],
      },
    ],
  },
  {
    key: 'knowledge_base',
    label: 'Base de Conocimiento',
    category: 'Clientes',
    icon: 'BookOpen',
    route: '/customer-support/knowledge-base',
    steps: [
      {
        title: 'Artículos de ayuda',
        description: 'Creá artículos de ayuda que tus clientes pueden consultar sin contactarte.',
        position: 'bottom',
        nextSteps: [
          'Revisá las categorías de artículos existentes',
          'Identificá las preguntas más frecuentes de soporte',
          'Organizá los artículos por tema para fácil acceso',
        ],
      },
      {
        title: 'Crear artículo',
        description: 'Escribí guías, FAQs o tutoriales paso a paso para reducir consultas repetitivas.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Nuevo Artículo" para empezar',
          'Elegí una categoría y escribí un título descriptivo',
          'Redactá el contenido con pasos claros y capturas si es posible',
        ],
      },
      {
        title: 'Publicar y compartir',
        description: 'Los artículos publicados quedan disponibles para que tus clientes los consulten.',
        position: 'top',
        nextSteps: [
          'Publicá el artículo cambiando su estado a "Activo"',
          'Compartí el link directo con clientes que pregunten',
          'Vinculá artículos relevantes en respuestas de tickets',
        ],
      },
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
      {
        title: 'Tu catálogo de productos',
        description: 'Acá administrás todos tus productos con precios, stock, categorías y variantes.',
        position: 'bottom',
        nextSteps: [
          'Revisá el catálogo completo de productos activos',
          'Filtrá por categoría, marca o estado de stock',
          'Buscá un producto por nombre o código de barras',
        ],
      },
      {
        title: 'Agregar producto',
        description: 'Cargá productos con código, nombre, precio de venta, costo, stock mínimo e imágenes.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Nuevo Producto" para empezar',
          'Completá nombre, código, precio de venta y costo',
          'Definí stock mínimo para recibir alertas automáticas',
        ],
      },
      {
        title: 'Categorías y variantes',
        description: 'Organizá productos en categorías. Creá variantes (talle, color) para un mismo producto.',
        position: 'bottom',
        nextSteps: [
          'Creá categorías antes de cargar muchos productos',
          'Usá variantes para productos con opciones (S, M, L)',
          'Asigná una categoría a cada producto nuevo',
        ],
      },
      {
        title: 'Importar en lote',
        description: 'Podés importar productos masivamente desde un archivo CSV o Excel.',
        position: 'top',
        nextSteps: [
          'Descargá la plantilla CSV desde el botón "Importar"',
          'Completá los campos obligatorios en la plantilla',
          'Subí el archivo y revisá los productos detectados antes de confirmar',
        ],
      },
    ],
  },
  {
    key: 'inventory_alerts',
    label: 'Alertas de Inventario',
    category: 'Inventario',
    icon: 'AlertCircle',
    route: '/inventory-alerts',
    steps: [
      {
        title: 'Alertas de stock',
        description: 'Recibí notificaciones automáticas cuando el stock de un producto baja del mínimo.',
        position: 'bottom',
        nextSteps: [
          'Revisá las alertas activas y productos con stock crítico',
          'Verificá que tus productos tengan stock mínimo configurado',
          'Tomá acción: generá una orden de compra para reponer',
        ],
      },
      {
        title: 'Configurar reglas',
        description: 'Definí umbrales por producto o categoría para que las alertas se disparen correctamente.',
        position: 'bottom',
        nextSteps: [
          'Creá una regla nueva para productos importantes',
          'Definí el umbral mínimo de stock por producto',
          'Elegí el canal de notificación: email, sistema o ambos',
        ],
      },
      {
        title: 'Actuar sobre alertas',
        description: 'Desde cada alerta podés generar directamente una orden de compra al proveedor.',
        position: 'top',
        nextSteps: [
          'Hacé clic en una alerta para ver opciones',
          'Generá la orden de compra sugerida con un clic',
          'Una vez repuesto, la alerta se resuelve automáticamente',
        ],
      },
    ],
  },
  {
    key: 'warehouses',
    label: 'Depósitos',
    category: 'Inventario',
    icon: 'Warehouse',
    route: '/warehouses',
    steps: [
      {
        title: 'Gestión de depósitos',
        description: 'Gestioná múltiples ubicaciones de almacenamiento para tu mercadería.',
        position: 'bottom',
        nextSteps: [
          'Revisá los depósitos configurados actualmente',
          'Verificá que cada depósito tenga dirección y responsable',
          'Controlá el stock total por depósito',
        ],
      },
      {
        title: 'Crear depósito',
        description: 'Agregá un nuevo depósito con nombre, dirección, responsable y capacidad.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Nuevo Depósito" para empezar',
          'Completá nombre, dirección y persona responsable',
          'Definí si es el depósito principal o secundario',
        ],
      },
      {
        title: 'Transferencias entre depósitos',
        description: 'Mové mercadería entre depósitos para balancear stock según demanda.',
        position: 'top',
        nextSteps: [
          'Identificá desequilibrios de stock entre locaciones',
          'Usá el módulo de Transferencias para mover productos',
          'Verificá el stock actualizado después de cada movimiento',
        ],
      },
    ],
  },
  {
    key: 'warehouse_stock',
    label: 'Stock por Depósito',
    category: 'Inventario',
    icon: 'PackageSearch',
    route: '/warehouse-stock',
    steps: [
      {
        title: 'Consultar stock',
        description: 'Consultá el stock de cada producto en cada depósito en tiempo real.',
        position: 'bottom',
        nextSteps: [
          'Filtrá por depósito para ver su inventario completo',
          'Buscá un producto específico para ver en qué depósitos está',
          'Exportá el reporte de stock para inventario físico',
        ],
      },
      {
        title: 'Ajustar stock manualmente',
        description: 'Cuando el stock real no coincide con el sistema, hacé un ajuste manual con motivo.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el producto y depósito a ajustar',
          'Ingresá la cantidad real encontrada en el conteo',
          'Registrá el motivo del ajuste: merma, error, inventario, etc.',
        ],
      },
      {
        title: 'Seguimiento de movimientos',
        description: 'Cada movimiento de stock queda registrado con fecha, usuario y motivo para auditoría.',
        position: 'top',
        nextSteps: [
          'Revisá el historial de movimientos por producto',
          'Identificá discrepancias recurrentes',
          'Usá esta info para mejorar procesos de control',
        ],
      },
    ],
  },
  {
    key: 'warehouse_transfers',
    label: 'Transferencias',
    category: 'Inventario',
    icon: 'ArrowLeftRight',
    route: '/warehouse-transfers',
    steps: [
      {
        title: 'Transferencias de stock',
        description: 'Mové mercadería entre depósitos con registro completo y trazabilidad.',
        position: 'bottom',
        nextSteps: [
          'Revisá las transferencias pendientes y completadas',
          'Verificá que origen y destino sean correctos',
          'Controlá las cantidades transferidas vs. recibidas',
        ],
      },
      {
        title: 'Crear transferencia',
        description: 'Seleccioná depósito origen, destino y los productos con cantidades a mover.',
        position: 'bottom',
        nextSteps: [
          'Elegí el depósito de origen y destino',
          'Agregá los productos y cantidades a transferir',
          'Confirmá la transferencia y esperá confirmación de recepción',
        ],
      },
      {
        title: 'Confirmar recepción',
        description: 'El depósito destino confirma la recepción, validando cantidades y estado.',
        position: 'top',
        nextSteps: [
          'Verificá las cantidades recibidas contra lo enviado',
          'Reportá diferencias si las hubiera',
          'Confirmá la recepción para actualizar el stock',
        ],
      },
    ],
  },
  {
    key: 'stock_reservations',
    label: 'Reservas de Stock',
    category: 'Inventario',
    icon: 'PackageCheck',
    route: '/stock-reservations',
    steps: [
      {
        title: 'Stock reservado',
        description: 'Consultá qué productos están reservados para pedidos pendientes de entregar.',
        position: 'bottom',
        nextSteps: [
          'Revisá las reservas activas y su fecha de vencimiento',
          'Identificá productos con alta demanda de reservas',
          'Liberá reservas vencidas para disponibilizar stock',
        ],
      },
      {
        title: 'Gestionar reservas',
        description: 'Las reservas se crean automáticamente al confirmar un pedido. Podés liberarlas manualmente.',
        position: 'bottom',
        nextSteps: [
          'Revisá los pedidos asociados a cada reserva',
          'Liberá manualmente reservas de pedidos cancelados',
          'Controlá que el stock disponible no sea negativo',
        ],
      },
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
      {
        title: 'Gestión de compras',
        description: 'Gestioná pedidos a tus proveedores con seguimiento completo de estado y entrega.',
        position: 'bottom',
        nextSteps: [
          'Revisá las órdenes pendientes de recepción',
          'Filtrá por proveedor, fecha o estado',
          'Controlá que no haya órdenes vencidas sin recepcionar',
        ],
      },
      {
        title: 'Crear orden de compra',
        description: 'Seleccioná proveedor, agregá productos con cantidades y precios de compra.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el proveedor de la lista',
          'Agregá los productos que necesitás reponer',
          'Definí cantidades, precios de compra y fecha estimada',
        ],
      },
      {
        title: 'Enviar al proveedor',
        description: 'Generá el PDF de la orden y enviala por email directamente al proveedor.',
        position: 'bottom',
        nextSteps: [
          'Revisá el total de la orden antes de enviar',
          'Descargá el PDF o enviá por email al proveedor',
          'Seguí el estado hasta la recepción de mercadería',
        ],
      },
      {
        title: 'Recepcionar mercadería',
        description: 'Cuando llega el pedido, registrá la recepción para actualizar stock automáticamente.',
        position: 'top',
        nextSteps: [
          'Andá a "Recepción de Mercadería" cuando llegue el pedido',
          'Verificá cantidades recibidas vs. pedidas',
          'El stock se actualiza automáticamente al confirmar',
        ],
      },
    ],
  },
  {
    key: 'purchases',
    label: 'Historial de Compras',
    category: 'Compras',
    icon: 'Receipt',
    route: '/purchases',
    steps: [
      {
        title: 'Registro de compras',
        description: 'Todas las compras realizadas con datos de proveedor, productos, montos y comprobantes.',
        position: 'bottom',
        nextSteps: [
          'Filtrá por proveedor o período para analizar gastos',
          'Revisá los comprobantes asociados a cada compra',
          'Exportá el detalle para conciliación contable',
        ],
      },
      {
        title: 'Detalle de compra',
        description: 'Hacé clic en una compra para ver todos los ítems, precios unitarios y total.',
        position: 'bottom',
        nextSteps: [
          'Verificá precios de compra contra acuerdos con proveedores',
          'Revisá el comprobante fiscal asociado',
          'Controlá que los impuestos estén registrados correctamente',
        ],
      },
      {
        title: 'Análisis de costos',
        description: 'Usá el historial para analizar la evolución de precios de compra de tus productos.',
        position: 'top',
        nextSteps: [
          'Compará precios del mismo producto en distintas fechas',
          'Identificá proveedores con mejores precios',
          'Ajustá precios de venta según variaciones en costos',
        ],
      },
    ],
  },
  {
    key: 'purchase_reception',
    label: 'Recepción de Mercadería',
    category: 'Compras',
    icon: 'PackageOpen',
    route: '/purchase-reception',
    steps: [
      {
        title: 'Recepción de pedidos',
        description: 'Registrá la llegada de mercadería y actualizá stock automáticamente.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná la orden de compra a recibir',
          'Verificá qué productos y cantidades han llegado',
          'Reportá diferencias si lo recibido no coincide',
        ],
      },
      {
        title: 'Verificar cantidades',
        description: 'Contá la mercadería recibida y registrá las cantidades reales por producto.',
        position: 'bottom',
        nextSteps: [
          'Compará lo recibido contra lo pedido línea por línea',
          'Marcá faltantes o excedentes si los hay',
          'Registrá el estado de los productos recibidos',
        ],
      },
      {
        title: 'Confirmar recepción',
        description: 'Al confirmar, el stock se actualiza y la orden cambia a "Recibida".',
        position: 'top',
        nextSteps: [
          'Revisá el resumen final antes de confirmar',
          'Confirmá la recepción para impactar el stock',
          'Si hay diferencias, generá un reclamo al proveedor',
        ],
      },
    ],
  },
  {
    key: 'purchase_returns',
    label: 'Devoluciones a Proveedores',
    category: 'Compras',
    icon: 'TrendingDown',
    route: '/purchase-returns',
    steps: [
      {
        title: 'Devoluciones a proveedores',
        description: 'Devolvé mercadería defectuosa, sobrante o incorrecta a tus proveedores.',
        position: 'bottom',
        nextSteps: [
          'Revisá el historial de devoluciones realizadas',
          'Verificá que cada devolución tenga nota de crédito asociada',
          'Controlá el impacto en el stock de cada devolución',
        ],
      },
      {
        title: 'Crear devolución',
        description: 'Seleccioná la compra original, elegí los productos a devolver y registrá el motivo.',
        position: 'bottom',
        nextSteps: [
          'Buscá la compra o recepción de origen',
          'Seleccioná los productos y cantidades a devolver',
          'Indicá el motivo: defecto, error, sobrante',
        ],
      },
      {
        title: 'Seguimiento',
        description: 'Seguí el estado de la devolución hasta que el proveedor la acepte y emita la nota de crédito.',
        position: 'top',
        nextSteps: [
          'Controlá que el proveedor reciba la mercadería',
          'Solicitá la nota de crédito correspondiente',
          'Registrá la nota de crédito cuando la recibas',
        ],
      },
    ],
  },
  {
    key: 'suppliers',
    label: 'Proveedores',
    category: 'Compras',
    icon: 'Truck',
    route: '/suppliers',
    steps: [
      {
        title: 'Base de proveedores',
        description: 'Administrá tu base de proveedores con datos de contacto y condiciones comerciales.',
        position: 'bottom',
        nextSteps: [
          'Revisá los proveedores cargados y sus datos',
          'Verificá que cada proveedor tenga CUIT y contacto',
          'Filtrá por rubro o tipo de producto que proveen',
        ],
      },
      {
        title: 'Agregar proveedor',
        description: 'Registrá proveedores con nombre, CUIT, contacto, condiciones y plazo de pago.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Nuevo Proveedor" para empezar',
          'Completá razón social, CUIT y datos de contacto',
          'Definí condiciones de pago: contado, 30 días, etc.',
        ],
      },
      {
        title: 'Analizar compras por proveedor',
        description: 'Desde el perfil del proveedor podés ver el historial completo de compras y montos.',
        position: 'top',
        nextSteps: [
          'Abrí el perfil de un proveedor habitual',
          'Revisá el volumen de compras del último mes',
          'Compará precios entre proveedores del mismo rubro',
        ],
      },
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
      {
        title: 'Tus cuentas bancarias',
        description: 'Registrá tus cuentas para trackear movimientos, saldos y conciliaciones.',
        position: 'bottom',
        nextSteps: [
          'Revisá las cuentas bancarias ya configuradas',
          'Verificá que los saldos estén actualizados',
          'Agregá cuentas faltantes (cajas de ahorro, corrientes)',
        ],
      },
      {
        title: 'Agregar cuenta',
        description: 'Cargá banco, tipo de cuenta, número, CBU/alias y saldo inicial.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el banco de la lista',
          'Completá número de cuenta y CBU/alias',
          'Ingresá el saldo inicial actual de la cuenta',
        ],
      },
      {
        title: 'Control de saldos',
        description: 'Monitoreá los saldos de todas tus cuentas desde un solo panel.',
        position: 'top',
        nextSteps: [
          'Revisá diariamente los saldos disponibles',
          'Conciliá con los extractos bancarios periódicamente',
          'Identificá movimientos no reconocidos',
        ],
      },
    ],
  },
  {
    key: 'bank_movements',
    label: 'Movimientos Bancarios',
    category: 'Finanzas',
    icon: 'DollarSign',
    route: '/bank-movements',
    steps: [
      {
        title: 'Movimientos bancarios',
        description: 'Registrá ingresos, egresos y transferencias entre tus cuentas bancarias.',
        position: 'bottom',
        nextSteps: [
          'Revisá los últimos movimientos registrados',
          'Filtrá por cuenta, tipo (ingreso/egreso) o período',
          'Verificá que cada movimiento tenga concepto y referencia',
        ],
      },
      {
        title: 'Registrar movimiento',
        description: 'Cargá depósitos, extracciones, transferencias o débitos automáticos.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná la cuenta y tipo de movimiento',
          'Ingresá monto, fecha y concepto descriptivo',
          'Asociá el movimiento a una operación si corresponde',
        ],
      },
      {
        title: 'Conciliación',
        description: 'Compará los movimientos del sistema con el extracto bancario para detectar diferencias.',
        position: 'top',
        nextSteps: [
          'Descargá el extracto bancario del período',
          'Compará línea por línea con los movimientos del sistema',
          'Registrá los movimientos faltantes que aparezcan en el extracto',
        ],
      },
    ],
  },
  {
    key: 'card_movements',
    label: 'Movimientos de Tarjetas',
    category: 'Finanzas',
    icon: 'CreditCard',
    route: '/card-movements',
    steps: [
      {
        title: 'Control de tarjetas',
        description: 'Controlá ventas con tarjeta, cupones generados, comisiones y liquidaciones.',
        position: 'bottom',
        nextSteps: [
          'Revisá los cupones de tarjeta pendientes de liquidar',
          'Verificá las comisiones aplicadas por la procesadora',
          'Controlá las liquidaciones recibidas vs. las esperadas',
        ],
      },
      {
        title: 'Seguimiento de liquidaciones',
        description: 'Cada venta con tarjeta genera un cupón que se liquida en los días siguientes.',
        position: 'bottom',
        nextSteps: [
          'Revisá el estado de cada cupón: pendiente, liquidado, rechazado',
          'Controlá los plazos de acreditación por tarjeta',
          'Conciliá las liquidaciones con los depósitos bancarios',
        ],
      },
    ],
  },
  {
    key: 'retentions',
    label: 'Retenciones',
    category: 'Finanzas',
    icon: 'Calculator',
    route: '/retentions',
    steps: [
      {
        title: 'Retenciones impositivas',
        description: 'Gestioná retenciones de IVA, Ganancias e IIBB aplicadas y sufridas.',
        position: 'bottom',
        nextSteps: [
          'Revisá las retenciones del período fiscal actual',
          'Filtrá por tipo: IVA, Ganancias, Ingresos Brutos',
          'Verificá que cada retención tenga comprobante',
        ],
      },
      {
        title: 'Registrar retención',
        description: 'Cargá retenciones recibidas de clientes o aplicadas a proveedores.',
        position: 'bottom',
        nextSteps: [
          'Indicá tipo de retención y régimen aplicable',
          'Ingresá monto, nro. de certificado y fecha',
          'Asociá al comprobante de venta/compra correspondiente',
        ],
      },
      {
        title: 'Exportar para DDJJ',
        description: 'Exportá las retenciones en formato compatible con AFIP para la declaración jurada.',
        position: 'top',
        nextSteps: [
          'Seleccioná el período fiscal a exportar',
          'Descargá el archivo en formato SICORE o compatible',
          'Enviá el archivo a tu contador para la DDJJ',
        ],
      },
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
      {
        title: 'Órdenes de servicio',
        description: 'Gestioná reparaciones, presupuestos de servicio técnico y entrega de equipos.',
        position: 'bottom',
        nextSteps: [
          'Revisá las órdenes abiertas y su estado actual',
          'Filtrá por prioridad: urgente, normal, baja',
          'Controlá los tiempos de reparación por técnico',
        ],
      },
      {
        title: 'Crear orden de servicio',
        description: 'Registrá el equipo del cliente, diagnóstico, presupuesto y asigná a un técnico.',
        position: 'bottom',
        nextSteps: [
          'Ingresá datos del cliente y equipo recibido',
          'Describí el problema reportado por el cliente',
          'Asigná a un técnico y definí prioridad',
        ],
      },
      {
        title: 'Seguimiento y entrega',
        description: 'Seguí el avance de cada orden hasta la reparación y entrega al cliente.',
        position: 'top',
        nextSteps: [
          'Actualizá el estado: diagnóstico → presupuesto → reparación → listo',
          'Registrá repuestos utilizados y su costo',
          'Notificá al cliente cuando esté listo para retirar',
        ],
      },
    ],
  },
  {
    key: 'cash_register',
    label: 'Gestión de Caja',
    category: 'Operaciones',
    icon: 'Banknote',
    route: '/cash-register',
    steps: [
      {
        title: 'Control de caja',
        description: 'Abrí y cerrá cajas diarias con control de efectivo, movimientos y arqueo.',
        position: 'bottom',
        nextSteps: [
          'Verificá si hay una caja abierta actualmente',
          'Revisá el historial de cajas cerradas del mes',
          'Controlá que no haya cajas sin cerrar de días anteriores',
        ],
      },
      {
        title: 'Abrir caja',
        description: 'Iniciá el día abriendo la caja con el monto de efectivo inicial.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Abrir Caja" para empezar el día',
          'Contá el efectivo disponible e ingresá el monto',
          'A partir de acá, todas las ventas se registran en esta caja',
        ],
      },
      {
        title: 'Movimientos de caja',
        description: 'Durante el día podés registrar ingresos y egresos extras (sangría, depósitos, gastos).',
        position: 'bottom',
        nextSteps: [
          'Registrá sangría si sacás efectivo de la caja',
          'Registrá depósitos externos o ingresos no vinculados a ventas',
          'Cada movimiento queda auditado con fecha y usuario',
        ],
      },
      {
        title: 'Cierre de caja',
        description: 'Al final del día, cerrá la caja con el conteo real y el sistema calcula diferencias.',
        position: 'top',
        nextSteps: [
          'Contá todo el efectivo y cargá el monto real',
          'El sistema compara con lo esperado y muestra la diferencia',
          'Confirmá el cierre para generar el reporte diario',
        ],
      },
    ],
  },
  {
    key: 'expenses',
    label: 'Gastos',
    category: 'Operaciones',
    icon: 'Receipt',
    route: '/expenses',
    steps: [
      {
        title: 'Control de gastos',
        description: 'Registrá y controlá todos los gastos operativos de tu negocio.',
        position: 'bottom',
        nextSteps: [
          'Revisá los gastos del mes actual por categoría',
          'Compará con el mes anterior para detectar variaciones',
          'Identificá las categorías con mayor gasto',
        ],
      },
      {
        title: 'Registrar gasto',
        description: 'Cargá gastos con categoría, proveedor, monto, fecha y comprobante.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná la categoría: alquiler, servicios, insumos, etc.',
          'Ingresá monto, fecha y proveedor o destinatario',
          'Adjuntá foto o PDF del comprobante si tenés',
        ],
      },
      {
        title: 'Análisis de rentabilidad',
        description: 'Los gastos se cruzan con las ventas para calcular la rentabilidad real del negocio.',
        position: 'top',
        nextSteps: [
          'Andá a Reportes para ver el análisis de rentabilidad',
          'Revisá el margen neto restando gastos de las ventas',
          'Definí un presupuesto mensual por categoría de gasto',
        ],
      },
    ],
  },
  {
    key: 'checks',
    label: 'Cheques',
    category: 'Operaciones',
    icon: 'FileText',
    route: '/checks',
    steps: [
      {
        title: 'Gestión de cheques',
        description: 'Administrá cheques propios emitidos y de terceros recibidos, con control de vencimientos.',
        position: 'bottom',
        nextSteps: [
          'Revisá los cheques próximos a vencer',
          'Filtrá por tipo: propios, de terceros',
          'Controlá el estado: en cartera, depositado, rechazado',
        ],
      },
      {
        title: 'Registrar cheque',
        description: 'Cargá cheques recibidos de clientes o emitidos a proveedores con todos los datos.',
        position: 'bottom',
        nextSteps: [
          'Indicá si es cheque propio o de terceros',
          'Ingresá banco, número, monto y fecha de vencimiento',
          'Asociá al cliente o proveedor correspondiente',
        ],
      },
      {
        title: 'Depositar o endosar',
        description: 'Los cheques de terceros podés depositarlos en tu cuenta o endosarlos a un proveedor.',
        position: 'top',
        nextSteps: [
          'Seleccioná el cheque desde la cartera',
          'Elegí: depositar en cuenta bancaria o endosar a tercero',
          'Registrá la operación para actualizar el estado',
        ],
      },
    ],
  },
  {
    key: 'promotions',
    label: 'Promociones',
    category: 'Operaciones',
    icon: 'Tag',
    route: '/promotions',
    steps: [
      {
        title: 'Promociones activas',
        description: 'Creá descuentos y ofertas especiales para incentivar ventas.',
        position: 'bottom',
        nextSteps: [
          'Revisá las promociones vigentes actualmente',
          'Verificá fechas de inicio y fin de cada promo',
          'Controlá cuántas veces se aplicó cada descuento',
        ],
      },
      {
        title: 'Crear promoción',
        description: 'Definí tipo de descuento, productos alcanzados, vigencia y condiciones.',
        position: 'bottom',
        nextSteps: [
          'Elegí el tipo: porcentaje, monto fijo, 2x1, etc.',
          'Seleccioná los productos o categorías incluidas',
          'Definí fecha de inicio, fin y condiciones mínimas',
        ],
      },
      {
        title: 'Medir resultados',
        description: 'Analizá el impacto de cada promoción en ventas y margen.',
        position: 'top',
        nextSteps: [
          'Revisá cuántas ventas usaron cada promoción',
          'Compará ventas del período promocional vs. normal',
          'Ajustá futuras promos según lo que mejor funcionó',
        ],
      },
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
      {
        title: 'Liquidación de sueldos',
        description: 'Generá recibos de sueldo, calculá aportes y gestioná pagos a empleados.',
        position: 'bottom',
        nextSteps: [
          'Verificá que los datos de empleados estén actualizados',
          'Seleccioná el período a liquidar (mensual, quincenal)',
          'Revisá conceptos: sueldo básico, presentismo, horas extra',
        ],
      },
      {
        title: 'Generar liquidación',
        description: 'El sistema calcula aportes, deducciones y neto a pagar según convenio.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná los empleados a incluir en la liquidación',
          'Verificá los conceptos calculados línea por línea',
          'Confirmá y generá los recibos de sueldo en PDF',
        ],
      },
      {
        title: 'Pagar y registrar',
        description: 'Registrá los pagos realizados y generá los archivos para transferencias bancarias.',
        position: 'top',
        nextSteps: [
          'Exportá el archivo de transferencias al banco',
          'Registrá cada pago realizado en el sistema',
          'Distribuí los recibos de sueldo a cada empleado',
        ],
      },
    ],
  },
  {
    key: 'commissions',
    label: 'Comisiones',
    category: 'RRHH',
    icon: 'TrendingUp',
    route: '/commissions',
    steps: [
      {
        title: 'Comisiones por ventas',
        description: 'Calculá comisiones automáticas para tu equipo comercial según reglas configuradas.',
        position: 'bottom',
        nextSteps: [
          'Revisá el esquema de comisiones vigente',
          'Verificá los montos calculados por vendedor',
          'Filtrá por período para ver comisiones mensuales',
        ],
      },
      {
        title: 'Configurar reglas',
        description: 'Definí porcentajes de comisión por vendedor, producto, categoría o monto de venta.',
        position: 'bottom',
        nextSteps: [
          'Elegí la base de cálculo: monto de venta o margen',
          'Definí el porcentaje para cada vendedor o nivel',
          'Establecé escalas progresivas si corresponde',
        ],
      },
      {
        title: 'Liquidar comisiones',
        description: 'Aprobá y pagá las comisiones del período. Se pueden incluir en la liquidación de sueldos.',
        position: 'top',
        nextSteps: [
          'Revisá el detalle de ventas de cada vendedor',
          'Aprobá las comisiones calculadas',
          'Incluílas en la liquidación o pagalas por separado',
        ],
      },
    ],
  },
  {
    key: 'employees',
    label: 'Empleados',
    category: 'RRHH',
    icon: 'UserCheck',
    route: '/employees',
    steps: [
      {
        title: 'Gestión de equipo',
        description: 'Gestioná tu equipo con roles, permisos, datos laborales y acceso al sistema.',
        position: 'bottom',
        nextSteps: [
          'Revisá la lista de empleados y sus roles',
          'Verificá que cada empleado tenga los permisos correctos',
          'Controlá empleados activos vs. dados de baja',
        ],
      },
      {
        title: 'Agregar empleado',
        description: 'Invitá empleados por email y asignales un rol con permisos específicos.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Nuevo Empleado" para empezar',
          'Ingresá email — recibirá una invitación automática',
          'Asigná un rol: administrador, vendedor, cajero, etc.',
        ],
      },
      {
        title: 'Permisos y roles',
        description: 'Cada rol define qué módulos y acciones puede realizar el empleado.',
        position: 'bottom',
        nextSteps: [
          'Revisá los roles existentes y sus permisos',
          'Creá un rol personalizado si los estándar no alcanzan',
          'Asegurate de que los cajeros solo accedan al POS y caja',
        ],
      },
      {
        title: 'Datos laborales',
        description: 'Registrá fecha de ingreso, convenio, categoría, obra social y datos bancarios.',
        position: 'top',
        nextSteps: [
          'Completá los datos laborales de cada empleado',
          'Cargá convenio y categoría para liquidación',
          'Ingresá CBU para transferencias de sueldo',
        ],
      },
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
      {
        title: 'Centro de reportes',
        description: 'Analizá el rendimiento de tu negocio con reportes visuales y exportables.',
        position: 'bottom',
        nextSteps: [
          'Explorá los tipos de reporte disponibles',
          'Empezá por "Ventas por período" para un panorama general',
          'Usá los filtros de fecha para comparar meses',
        ],
      },
      {
        title: 'Filtros y personalización',
        description: 'Filtrá por período, categoría, vendedor, producto o tipo de reporte.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el rango de fechas que te interesa',
          'Filtrá por categoría o vendedor para análisis específicos',
          'Probá distintos tipos de gráficos: barras, líneas, tortas',
        ],
      },
      {
        title: 'Exportar reportes',
        description: 'Descargá cualquier reporte en PDF, CSV o Excel para compartir o archivar.',
        position: 'bottom',
        nextSteps: [
          'Usá "Exportar PDF" para presentaciones',
          'Usá "Exportar CSV" para análisis en planillas',
          'Programá reportes automáticos por email (si disponible)',
        ],
      },
      {
        title: 'Reportes clave',
        description: 'Los más útiles: ventas por período, rentabilidad, stock valorizado, cuentas a cobrar.',
        position: 'top',
        nextSteps: [
          'Revisá "Ventas por período" semanalmente',
          'Controlá "Rentabilidad" para conocer tu margen real',
          'Usá "Stock valorizado" para saber el valor de tu inventario',
        ],
      },
    ],
  },
  {
    key: 'accountant_reports',
    label: 'Reportes Contador',
    category: 'Reportes',
    icon: 'Shield',
    route: '/accountant-reports',
    steps: [
      {
        title: 'Reportes contables',
        description: 'Reportes especiales para tu contador: subdiario de IVA, retenciones, libro mayor.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el período fiscal a reportar',
          'Generá el subdiario de IVA ventas y compras',
          'Exportá en formato compatible con software contable',
        ],
      },
      {
        title: 'Enviar al contador',
        description: 'Exportá los reportes y compartílos directamente con tu contador.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná los reportes requeridos por tu contador',
          'Exportá en el formato solicitado (PDF, CSV, AFIP)',
          'Enviá por email o descargá para compartir por otro medio',
        ],
      },
      {
        title: 'Conciliación fiscal',
        description: 'Estos reportes te ayudan a detectar inconsistencias antes de presentar declaraciones.',
        position: 'top',
        nextSteps: [
          'Compará el IVA débito vs. crédito del período',
          'Verificá que las retenciones cuadren con los certificados',
          'Corregí diferencias antes de cerrar el período fiscal',
        ],
      },
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
      {
        title: 'Configuración general',
        description: 'Ajustá los parámetros generales de tu empresa y del sistema.',
        position: 'bottom',
        nextSteps: [
          'Verificá que el nombre y logo de la empresa estén correctos',
          'Revisá la configuración de moneda e impuestos',
          'Configurá los datos que aparecen en facturas y comprobantes',
        ],
      },
      {
        title: 'Datos fiscales',
        description: 'Configurá CUIT, condición ante IVA, domicilio fiscal y inicio de actividades.',
        position: 'bottom',
        nextSteps: [
          'Ingresá el CUIT de la empresa',
          'Elegí la condición ante IVA correcta',
          'Completá el domicilio fiscal oficial',
        ],
      },
      {
        title: 'Preferencias del sistema',
        description: 'Configurá zona horaria, formato de números, notificaciones y plantillas.',
        position: 'top',
        nextSteps: [
          'Seleccioná la zona horaria de tu ubicación',
          'Definí formato de moneda y separador de decimales',
          'Configurá las plantillas para emails automáticos',
        ],
      },
    ],
  },
  {
    key: 'pos_afip',
    label: 'Puntos de Venta AFIP',
    category: 'Administración',
    icon: 'Store',
    route: '/pos-points',
    steps: [
      {
        title: 'Puntos de venta habilitados',
        description: 'Configurá los puntos de venta habilitados en AFIP para emitir comprobantes.',
        position: 'bottom',
        nextSteps: [
          'Revisá los puntos de venta configurados',
          'Verificá que coincidan con los habilitados en AFIP',
          'Asigná cada punto de venta a una sucursal o caja',
        ],
      },
      {
        title: 'Agregar punto de venta',
        description: 'Cargá un nuevo punto de venta con número, tipo y estado.',
        position: 'bottom',
        nextSteps: [
          'Ingresá el número de punto de venta asignado por AFIP',
          'Seleccioná el tipo: factura electrónica, controlador fiscal',
          'Activá el punto de venta para empezar a facturar',
        ],
      },
    ],
  },
  {
    key: 'audit_logs',
    label: 'Auditoría',
    category: 'Administración',
    icon: 'Shield',
    route: '/audit-logs',
    steps: [
      {
        title: 'Registro de auditoría',
        description: 'Revisá todas las acciones realizadas en el sistema con detalle completo.',
        position: 'bottom',
        nextSteps: [
          'Filtrá por usuario para ver acciones de alguien específico',
          'Filtrá por tipo de acción: crear, editar, eliminar',
          'Revisá acciones recientes para detectar actividad inusual',
        ],
      },
      {
        title: 'Investigar eventos',
        description: 'Cada registro muestra quién, qué, cuándo y desde dónde se realizó la acción.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en un evento para ver el detalle completo',
          'Revisá los cambios antes/después de cada edición',
          'Exportá el log si necesitás evidencia de auditoría',
        ],
      },
    ],
  },
  {
    key: 'access_logs',
    label: 'Logs de Acceso',
    category: 'Administración',
    icon: 'Activity',
    route: '/access-logs',
    steps: [
      {
        title: 'Control de accesos',
        description: 'Controlá quién accedió al sistema, cuándo, desde qué IP y dispositivo.',
        position: 'bottom',
        nextSteps: [
          'Revisá los accesos de las últimas 24 horas',
          'Identificá accesos desde IPs o dispositivos desconocidos',
          'Verificá que no haya intentos de acceso fallidos sospechosos',
        ],
      },
      {
        title: 'Seguridad',
        description: 'Usá esta información para detectar accesos no autorizados.',
        position: 'top',
        nextSteps: [
          'Revisá periódicamente los accesos de todos los usuarios',
          'Si detectás actividad sospechosa, cambiá contraseñas',
          'Considerá habilitar doble factor de autenticación',
        ],
      },
    ],
  },
  {
    key: 'monthly_closing',
    label: 'Cierre Mensual',
    category: 'Administración',
    icon: 'Calendar',
    route: '/monthly-closing',
    steps: [
      {
        title: 'Cierre del período',
        description: 'Realizá el cierre contable del mes con validaciones automáticas.',
        position: 'bottom',
        nextSteps: [
          'Verificá que todas las cajas del mes estén cerradas',
          'Revisá que no haya comprobantes pendientes de registrar',
          'Controlá que las retenciones estén cargadas',
        ],
      },
      {
        title: 'Validaciones previas',
        description: 'El sistema valida que todo esté cuadrado antes de permitir el cierre.',
        position: 'bottom',
        nextSteps: [
          'Resolvé todos los errores que el validador detecte',
          'Conciliá cuentas bancarias antes de cerrar',
          'Una vez validado, confirmá el cierre del período',
        ],
      },
      {
        title: 'Post-cierre',
        description: 'Después del cierre, generá los reportes finales para tu contador.',
        position: 'top',
        nextSteps: [
          'Exportá los reportes contables del mes cerrado',
          'Enviá la documentación a tu contador',
          'El período queda bloqueado — no se pueden modificar operaciones',
        ],
      },
    ],
  },
  {
    key: 'bulk_operations',
    label: 'Operaciones Masivas',
    category: 'Administración',
    icon: 'Zap',
    route: '/bulk-operations',
    steps: [
      {
        title: 'Acciones en lote',
        description: 'Realizá actualizaciones masivas de precios, stock, categorías y más.',
        position: 'bottom',
        nextSteps: [
          'Elegí el tipo de operación: precios, stock, estado',
          'Seleccioná los registros a afectar con filtros',
          'Previsualizá los cambios antes de confirmar',
        ],
      },
      {
        title: 'Actualizar precios',
        description: 'Aumentá o disminuí precios por porcentaje o monto fijo a muchos productos a la vez.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná los productos por categoría o proveedor',
          'Definí el tipo de ajuste: % aumento, % descuento, monto fijo',
          'Revisá la previsualización y confirmá el cambio',
        ],
      },
      {
        title: 'Precauciones',
        description: 'Las operaciones masivas no se pueden deshacer fácilmente. Revisá bien antes de confirmar.',
        position: 'top',
        nextSteps: [
          'Hacé un backup o exportá antes de cambios grandes',
          'Empezá con un grupo pequeño de prueba',
          'Verificá los resultados después de aplicar',
        ],
      },
    ],
  },
  {
    key: 'notifications',
    label: 'Notificaciones',
    category: 'Administración',
    icon: 'Bell',
    route: '/notification-settings',
    steps: [
      {
        title: 'Centro de notificaciones',
        description: 'Configurá qué alertas recibís, con qué frecuencia y por qué canal.',
        position: 'bottom',
        nextSteps: [
          'Revisá las categorías de notificación disponibles',
          'Activá las alertas más relevantes para tu rol',
          'Desactivá las que no necesitás para evitar ruido',
        ],
      },
      {
        title: 'Canales de envío',
        description: 'Elegí dónde recibir cada tipo de alerta: en sistema, email o ambos.',
        position: 'bottom',
        nextSteps: [
          'Configurá alertas críticas (stock bajo, pagos) por email',
          'Dejá alertas informativas solo dentro del sistema',
          'Verificá que tu email esté correctamente configurado',
        ],
      },
      {
        title: 'Frecuencia',
        description: 'Algunas alertas pueden agruparse en resúmenes diarios en vez de enviarse una por una.',
        position: 'top',
        nextSteps: [
          'Elegí notificación inmediata para alertas urgentes',
          'Agrupá alertas de baja prioridad en resumen diario',
          'Probá recibir un email de prueba para verificar el canal',
        ],
      },
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
      {
        title: 'Conectá servicios externos',
        description: 'Integrá tu cuenta con email, WhatsApp, Google Calendar, Mercado Pago y más.',
        position: 'bottom',
        nextSteps: [
          'Revisá las integraciones disponibles',
          'Identificá cuáles son útiles para tu negocio',
          'Empezá conectando las más críticas: email y pagos',
        ],
      },
      {
        title: 'Configurar integración',
        description: 'Cada servicio tiene su proceso de conexión. Seguí los pasos guiados.',
        position: 'bottom',
        nextSteps: [
          'Hacé clic en "Conectar" en la integración deseada',
          'Seguí el flujo de autenticación del servicio externo',
          'Verificá que la conexión esté activa con el indicador verde',
        ],
      },
      {
        title: 'Monitorear estado',
        description: 'Controlá que las integraciones estén funcionando correctamente.',
        position: 'top',
        nextSteps: [
          'Revisá el estado de cada integración periódicamente',
          'Si una conexión falla, reconectá desde acá',
          'Consultá el log de errores si hay problemas recurrentes',
        ],
      },
    ],
  },
  {
    key: 'afip',
    label: 'Facturación AFIP',
    category: 'Integraciones',
    icon: 'Receipt',
    route: '/afip',
    steps: [
      {
        title: 'Facturación electrónica',
        description: 'Emití facturas electrónicas válidas ante AFIP directamente desde el sistema.',
        position: 'bottom',
        nextSteps: [
          'Verificá que tu certificado digital esté vigente',
          'Revisá los puntos de venta habilitados en AFIP',
          'Probá emitir una factura de prueba si es primera vez',
        ],
      },
      {
        title: 'Configurar certificado',
        description: 'Cargá tu certificado digital de AFIP para habilitar la emisión de comprobantes.',
        position: 'bottom',
        nextSteps: [
          'Descargá el certificado desde AFIP con clave fiscal',
          'Subí el archivo .crt y .key al sistema',
          'Verificá la conexión con el botón "Testear"',
        ],
      },
      {
        title: 'Emitir comprobantes',
        description: 'Generá facturas A, B, C, notas de crédito y débito con CAE automático.',
        position: 'bottom',
        nextSteps: [
          'Seleccioná el tipo de comprobante según el receptor',
          'Completá los datos del cliente y los ítems',
          'Confirmá y el sistema obtiene el CAE automáticamente',
        ],
      },
      {
        title: 'Consultar estado',
        description: 'Verificá el estado de comprobantes emitidos y reimprimí si necesitás.',
        position: 'top',
        nextSteps: [
          'Buscá comprobantes por número, fecha o cliente',
          'Verificá que todos tengan CAE válido',
          'Descargá o reimprimí facturas desde el detalle',
        ],
      },
    ],
  },
  {
    key: 'ai_assistant',
    label: 'Asistente de IA',
    category: 'Integraciones',
    icon: 'Sparkles',
    route: '/ai-assistant',
    steps: [
      {
        title: 'Tu copiloto inteligente',
        description: 'Hacé preguntas sobre tu negocio en lenguaje natural y recibí respuestas basadas en tus datos.',
        position: 'bottom',
        nextSteps: [
          'Probá preguntar: "¿Cuánto vendí este mes?"',
          'Pedí un análisis: "¿Cuáles son mis productos más vendidos?"',
          'Consultá predicciones: "¿Cómo se compara con el mes pasado?"',
        ],
      },
      {
        title: 'Tipos de consultas',
        description: 'Podés preguntar sobre ventas, inventario, clientes, gastos, rentabilidad y más.',
        position: 'bottom',
        nextSteps: [
          'Ventas: "Mostrá las ventas de la última semana"',
          'Stock: "¿Qué productos están por debajo del mínimo?"',
          'Clientes: "¿Quién es mi mejor cliente del mes?"',
        ],
      },
      {
        title: 'Acciones sugeridas',
        description: 'El asistente no solo responde — también sugiere acciones concretas para mejorar tu negocio.',
        position: 'top',
        nextSteps: [
          'Pedí recomendaciones: "¿Qué debo mejorar?"',
          'Solicitá alertas: "Avisame si bajan las ventas"',
          'Ejecutá acciones directas desde las sugerencias del chat',
        ],
      },
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
