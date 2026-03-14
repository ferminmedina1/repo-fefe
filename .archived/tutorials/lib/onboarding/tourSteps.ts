// ============================================================
// Tour Step definitions — guided walkthrough of the real app
// Each step points at an actual UI element and explains it.
// ============================================================

export interface TourStep {
  /** Unique ID for this step */
  id: string;
  /** Which onboarding phase this belongs to */
  phase: 'WELCOME' | 'BUSINESS_SETUP' | 'CREATE_FIRST_LEAD' | 'MOVE_PIPELINE' | 'ACTIVATE_AUTOMATION';
  /** Route to navigate to before showing this step */
  route: string;
  /** CSS selector for the target element to highlight */
  targetSelector: string;
  /** Tooltip position relative to the target */
  position: 'top' | 'bottom' | 'left' | 'right';
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Delay (ms) before showing this step after navigation — lets lazy pages render */
  delay?: number;
  /** If true, this is the last step in its phase and completing it should advance the state machine */
  advancesPhase?: boolean;
  /** If set, shows an action button label instead of "Siguiente" */
  actionLabel?: string;
  /** If true, wait for user to interact with the target before enabling "Siguiente" */
  waitForInteraction?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  // ── WELCOME ────────────────────────────────────────────────
  {
    id: 'welcome-sidebar',
    phase: 'WELCOME',
    route: '/app',
    targetSelector: 'nav.sidebar-scroll, nav.flex-1',
    position: 'right',
    title: 'Tu menú de navegación',
    description: 'Desde acá accedés a todos los módulos: ventas, clientes, inventario, reportes y más.',
    delay: 500,
  },
  {
    id: 'welcome-dashboard',
    phase: 'WELCOME',
    route: '/app',
    targetSelector: 'div.grid.grid-cols-2',
    position: 'bottom',
    title: 'Tu panel principal',
    description: 'Acá vas a ver las métricas clave de tu negocio: ventas del mes, margen, cobros y ventas del día.',
  },
  {
    id: 'welcome-search',
    phase: 'WELCOME',
    route: '/app',
    targetSelector: 'input[placeholder="Buscar módulo..."]',
    position: 'right',
    title: 'Búsqueda rápida',
    description: 'Escribí el nombre de cualquier módulo para encontrarlo al instante.',
  },
  {
    id: 'welcome-ai',
    phase: 'WELCOME',
    route: '/app',
    targetSelector: 'a[href="/ai-assistant"]',
    position: 'right',
    title: 'Asistente de IA',
    description: 'Tu copiloto inteligente. Preguntale sobre ventas, inventario o cualquier duda del sistema.',
    advancesPhase: true,
  },

  // ── BUSINESS_SETUP ─────────────────────────────────────────
  {
    id: 'setup-nav',
    phase: 'BUSINESS_SETUP',
    route: '/settings',
    targetSelector: 'a[href="/settings"]',
    position: 'right',
    title: 'Configuración de empresa',
    description: 'Acá configurás los datos de tu negocio: nombre, moneda, rubro e información fiscal.',
    delay: 500,
  },
  {
    id: 'setup-page',
    phase: 'BUSINESS_SETUP',
    route: '/settings',
    targetSelector: 'main',
    position: 'left',
    title: 'Completá tus datos',
    description: 'Revisá que el nombre de la empresa, moneda y rubro estén correctos. Estos datos aparecen en facturas y reportes.',
    advancesPhase: true,
    actionLabel: 'Entendido, continuar',
  },

  // ── CREATE_FIRST_LEAD ──────────────────────────────────────
  {
    id: 'lead-nav',
    phase: 'CREATE_FIRST_LEAD',
    route: '/customers',
    targetSelector: 'a[href="/customers"]',
    position: 'right',
    title: 'Módulo de Clientes',
    description: 'Acá gestionás todos tus contactos y clientes. Podés agregar, editar y ver el historial de cada uno.',
    delay: 500,
  },
  {
    id: 'lead-page',
    phase: 'CREATE_FIRST_LEAD',
    route: '/customers',
    targetSelector: 'main',
    position: 'left',
    title: 'Creá tu primer contacto',
    description: 'Usá el botón "Nuevo Cliente" para registrar tu primer contacto. Podés cargar nombre, email y teléfono.',
    advancesPhase: true,
    actionLabel: 'Entendido, continuar',
  },

  // ── MOVE_PIPELINE ──────────────────────────────────────────
  {
    id: 'pipeline-nav',
    phase: 'MOVE_PIPELINE',
    route: '/sales',
    targetSelector: 'a[href="/sales"]',
    position: 'right',
    title: 'Módulo de Ventas',
    description: 'Desde acá generás ventas, presupuestos y seguís el estado de cada operación.',
    delay: 500,
  },
  {
    id: 'pipeline-page',
    phase: 'MOVE_PIPELINE',
    route: '/sales',
    targetSelector: 'main',
    position: 'left',
    title: 'Gestioná tus ventas',
    description: 'Acá ves todas tus ventas. Podés crear una nueva, filtrar por estado, cliente o fecha, y exportar reportes.',
    advancesPhase: true,
    actionLabel: 'Entendido, continuar',
  },

  // ── ACTIVATE_AUTOMATION ────────────────────────────────────
  {
    id: 'products-nav',
    phase: 'ACTIVATE_AUTOMATION',
    route: '/products',
    targetSelector: 'a[href="/products"]',
    position: 'right',
    title: 'Catálogo de Productos',
    description: 'Acá cargás y organizás tu inventario: productos, precios, stock, categorías y variantes.',
    delay: 500,
  },
  {
    id: 'pos-nav',
    phase: 'ACTIVATE_AUTOMATION',
    route: '/pos',
    targetSelector: 'a[href="/pos"]',
    position: 'right',
    title: 'Punto de Venta',
    description: 'Tu caja registradora digital. Desde acá vendés rápidamente con búsqueda de productos, descuentos y múltiples medios de pago.',
    delay: 500,
  },
  {
    id: 'reports-nav',
    phase: 'ACTIVATE_AUTOMATION',
    route: '/app',
    targetSelector: 'a[href="/reports"]',
    position: 'right',
    title: 'Reportes',
    description: 'Analizá el rendimiento de tu negocio con reportes de ventas, inventario, rentabilidad y más.',
  },
  {
    id: 'tour-complete',
    phase: 'ACTIVATE_AUTOMATION',
    route: '/app',
    targetSelector: 'h1',
    position: 'bottom',
    title: '¡Listo! Ya conocés la plataforma',
    description: 'Explorá cada módulo a tu ritmo. Si necesitás ayuda, usá el asistente de IA o escribinos por soporte.',
    advancesPhase: true,
    actionLabel: 'Finalizar tour',
  },
];

/** Get all steps for a given phase */
export function getStepsForPhase(phase: string): TourStep[] {
  return TOUR_STEPS.filter((s) => s.phase === phase);
}

/** Get total tour steps count */
export function getTotalTourSteps(): number {
  return TOUR_STEPS.length;
}
