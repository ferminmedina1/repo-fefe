// ============================================================
// Knowledge Base Articles Data
// ============================================================

import { KBArticle } from './types';

export const KB_ARTICLES: KBArticle[] = [
  // Dashboard Articles
  {
    id: 'kb-dash-1',
    title: '¿Cómo interpretar el Dashboard?',
    description: 'Aprende a leer las métricas principales del dashboard',
    content: `El dashboard te muestra un resumen ejecutivo de tu negocio. Aquí encontrarás:

**KPIs Principales:**
- Ventas del Mes: Total de ingresos del mes actual
- Margen Bruto: Rentabilidad de tus ventas
- Por Cobrar: Dinero pendiente de clientes
- Ventas Hoy: Ingresos del día actual

**Gráficos:**
- Evolución de ventas últimos 7 días
- Top 5 productos por rentabilidad
- Top 5 clientes del mes
- Alertas de stock bajo

**Consejo:** Usa estos datos para tomar decisiones diarias sobre inventario y promociones.`,
    category: 'dashboard',
    tags: ['métricas', 'kpis', 'inicio', 'novato'],
    views: 245,
    helpful: 89,
    created_at: '2026-01-15',
    updated_at: '2026-01-15',
    readTime: 5,
  },
  {
    id: 'kb-dash-2',
    title: 'Configurar widgets del Dashboard',
    description: 'Personaliza qué información ver en tu dashboard',
    content: `El dashboard es personalizable. Para configurarlo:

1. Haz clic en el botón **Personalizar Dashboard** (en construcción)
2. Selecciona qué widgets quieres ver
3. Ordena los widgets según tu preferencia
4. Guarda los cambios

**Widgets disponibles:**
- KPIs rápidos (ventas, margen, cobrar)
- Gráficos de ventas
- Top productos
- Top clientes
- Alertas
- Cartera vencida
- Tablero de cotizaciones

Tu configuración se guarda automáticamente.`,
    category: 'dashboard',
    tags: ['personalización', 'widgets', 'configuración'],
    views: 156,
    helpful: 67,
    created_at: '2026-01-15',
    updated_at: '2026-01-15',
    readTime: 4,
  },

  // Sales Articles
  {
    id: 'kb-sales-1',
    title: 'Registrar una nueva venta',
    description: 'Paso a paso para crear una nueva venta',
    content: `Para registrar una venta:

1. Ve a **Ventas** → **Nuevas Ventas**
2. Selecciona el cliente (o crea uno nuevo)
3. Agrega productos:
   - Click en **+ Agregar Producto**
   - Selecciona producto
   - Ingresa cantidad
   - Precio se calcula automáticamente
4. Selecciona método de pago (efectivo, tarjeta, etc)
5. Revisa el total
6. Click en **Confirmar Venta**

**Nota:** Las ventas se guardan con número automático. Puedes imprimir o enviar por email.`,
    category: 'sales',
    tags: ['venta', 'proceso', 'basico', 'cliente'],
    views: 412,
    helpful: 198,
    created_at: '2026-01-16',
    updated_at: '2026-02-10',
    readTime: 6,
  },
  {
    id: 'kb-sales-2',
    title: 'Crear presupuestos',
    description: 'Cómo hacer presupuestos a clientes',
    content: `Los presupuestos son propuestas de venta que puedes enviar a clientes:

1. Desde **Ventas** → **Presupuestos**
2. Click **Nuevo Presupuesto**
3. Selecciona cliente
4. Agrega productos con cantidades
5. El sistema calcula totales automáticamente
6. Puedes:
   - **Convertir a Venta** si el cliente acepta
   - **Enviar por Email** al cliente
   - **Imprimir** para presentar en persona
   - **Editar** antes de enviar

**Validez:** Define cuántos días es válido el presupuesto.`,
    category: 'sales',
    tags: ['presupuesto', 'cotización', 'cliente', 'flujo'],
    views: 287,
    helpful: 123,
    created_at: '2026-01-16',
    updated_at: '2026-02-15',
    readTime: 5,
  },

  // Products Articles
  {
    id: 'kb-prod-1',
    title: 'Agregar productos al catálogo',
    description: 'Cómo crear nuevos productos',
    content: `Para agregar un producto:

1. Ve a **Productos** → **Agregar Producto**
2. Completa información básica:
   - **Nombre:** Nombre del producto
   - **Precio:** Precio de venta
   - **Costo:** Costo del producto
   - **Stock:** Cantidad disponible
   - **Stock Mínimo:** Alerta cuando baja
3. Opcional:
   - Categoría
   - Código de barras
   - Imagen del producto
4. Click **Guardar**

**Ventaja:** El sistema calcula automáticamente margen (Precio - Costo).`,
    category: 'products',
    tags: ['producto', 'catalogo', 'inventario', 'basico'],
    views: 534,
    helpful: 287,
    created_at: '2026-01-17',
    updated_at: '2026-02-20',
    readTime: 5,
  },
  {
    id: 'kb-prod-2',
    title: 'Importar productos desde CSV',
    description: 'Carga masiva de productos desde archivo',
    content: `Para importar múltiples productos:

1. Ve a **Productos** → **Importar CSV**
2. Descarga la plantilla de ejemplo
3. Completa tu lista de productos:
   - nombre | precio | costo | stock | categoria
4. Guarda como CSV (Excel compatible)
5. Sube el archivo
6. Revisa la vista previa
7. Click **Importar**

**Importante:**
- Los nombres de columna deben coincidir
- Stock mínimo es opcional (default: 0)
- Validación de datos antes de importar
- Puedes hacer rollback si hay error`,
    category: 'products',
    tags: ['importar', 'csv', 'excel', 'masivo', 'integracion'],
    views: 389,
    helpful: 156,
    created_at: '2026-01-17',
    updated_at: '2026-02-20',
    readTime: 7,
  },

  // Customers Articles
  {
    id: 'kb-cust-1',
    title: 'Crear un nuevo cliente',
    description: 'Registro de clientes en el sistema',
    content: `Para crear un nuevo cliente:

1. Ve a **Clientes** → **Nuevo Cliente**
2. Información básica:
   - **Nombre:** Nombre del cliente
   - **Email:** Para notificaciones
   - **Teléfono:** Contacto
   - **Documento:** CUIT/DNI
3. Dirección:
   - Dirección
   - Ciudad
   - Código Postal
4. Opciones:
   - **Condiciones de Pago:** 30 días, al contado, etc.
   - **Límite de Crédito:** Si vende a crédito
   - **Lista de Precios:** Descuentos específicos
5. Click **Guardar**

**Ventaja:** El cliente se puede reutilizar en todas las ventas.`,
    category: 'customers',
    tags: ['cliente', 'cartera', 'basico', 'novato'],
    views: 456,
    helpful: 234,
    created_at: '2026-01-18',
    updated_at: '2026-02-25',
    readTime: 5,
  },
  {
    id: 'kb-cust-2',
    title: 'Gestión de cuenta corriente',
    description: 'Ver y administrar créditos de clientes',
    content: `La cuenta corriente muestra el historial de crédito:

1. Ve a **Clientes** → Selecciona cliente → **Ver Cuenta Corriente**
2. Verás:
   - **Saldo Actual:** Lo que debe el cliente
   - **Vencidas:** Facturas atrasadas
   - **Historial:** Todas las transacciones

**Acciones disponibles:**
- **Registrar Pago:** Ingresa pago recibido
- **Ver Detalle:** Abre factura original
- **Enviar Recordatorio:** Email de cobro
- **Crear Documento de Pago:** Vale o recibo

**Consejo:** Revisa cuentas vencidas periódicamente.`,
    category: 'customers',
    tags: ['crédito', 'cobro', 'cuenta corriente', 'deudores'],
    views: 312,
    helpful: 145,
    created_at: '2026-01-18',
    updated_at: '2026-02-25',
    readTime: 6,
  },

  // Inventory Articles
  {
    id: 'kb-inv-1',
    title: '¿Qué son las alertas de stock?',
    description: 'Mantén tu inventario bajo control',
    content: `Las alertas de stock te notifican cuando un producto necesita reorden:

**Tipos de alertas:**
- **Stock Bajo (amarillo):** Stock cayendo cerca del mínimo
- **Stock Crítico (rojo):** Stock por debajo del mínimo
- **Stock Agotado (gris):** Sin inventario disponible

**Cómo funcionan:**
1. Al crear un producto, defines el **Stock Mínimo**
2. El sistema monitorea automáticamente
3. Alerts aparecen en:
   - Dashboard (panel alertas)
   - Página de Productos
   - Email diarios (si está configurado)

**Acción:** Haz reorden de productos con alerta.`,
    category: 'inventory',
    tags: ['stock', 'alerta', 'minimo', 'reorden'],
    views: 278,
    helpful: 112,
    created_at: '2026-01-19',
    updated_at: '2026-02-10',
    readTime: 5,
  },

  // Settings Articles
  {
    id: 'kb-set-1',
    title: 'Configuración de empresa',
    description: 'Custodia y configuración de datos de empresa',
    content: `Para configurar tu empresa:

1. Ve a **Configuración** → **Datos de la Empresa**
2. Completa:
   - Nombre oficial
   - CUIT/DNI
   - Dirección legal
   - Teléfono
   - Email
   - Logo (opcional)
3. Información adicional:
   - Número de regla
   - Responsable del IVA
   - Condiciones de pago por defecto
4. Click **Guardar**

**Importante:** Estos datos aparecen en facturas y reportes.`,
    category: 'settings',
    tags: ['empresa', 'configuración', 'datos', 'setup'],
    views: 201,
    helpful: 89,
    created_at: '2026-01-20',
    updated_at: '2026-02-15',
    readTime: 4,
  },

  // General/FAQ Articles
  {
    id: 'kb-gen-1',
    title: '¿Cuál es la diferencia entre venta y presupuesto?',
    description: 'Entender los tipos de documentos',
    content: `**Venta:**
- Documento final y confirmado
- Número de venta único
- Disminuye automáticamente el stock
- Se registra en contabilidad
- Genera comprobante de pago
- No se puede eliminar (solo anular)

**Presupuesto:**
- Propuesta sin confirmar
- Válido por X días
- NO afecta stock
- No es oficial contable
- Se puede editar libremente
- Se convierte a venta cuando cliente acepta

**Casos de uso:**
- Presupuesto: Cliente pide precio primero
- Venta: Cliente confirma y paga`,
    category: 'general',
    tags: ['venta', 'presupuesto', 'diferencia', 'faq'],
    views: 523,
    helpful: 312,
    created_at: '2026-01-20',
    updated_at: '2026-02-20',
    readTime: 5,
  },
  {
    id: 'kb-gen-2',
    title: '¿Cómo hago backup de mis datos?',
    description: 'Protege tu información',
    content: `**Backups automáticos:**
- Sistema hace backup cada 24 horas
- Se guardan en servidor seguro
- Puedes recuperar últimos 30 días
- NO necesitas hacer nada

**Exportar datos:**
1. Ve a **Configuración** → **Exportar Datos**
2. Selecciona qué exportar:
   - Productos
   - Clientes
   - Ventas
   - Todas las tablas
3. Formato: CSV o Excel
4. Descarga el archivo

**Recomendación:** Exporta mensualmente como backup adicional.`,
    category: 'general',
    tags: ['backup', 'datos', 'seguridad', 'exportar'],
    views: 189,
    helpful: 156,
    created_at: '2026-01-20',
    updated_at: '2026-02-20',
    readTime: 4,
  },
];
