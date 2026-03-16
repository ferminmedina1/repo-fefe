// ============================================================
// Tutorial Types - Guía paso a paso por la app
// ============================================================

export interface TutorialStep {
  /** ID único del paso */
  id: string;
  /** Selector CSS del elemento a destacar */
  target?: string;
  /** Título del paso */
  title: string;
  /** Explicación simple */
  description: string;
  /** Posición del tooltip: top, bottom, left, right */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Acción sugerida (ej: "Haz clic en Crear Venta") */
  action?: string;
  /** Imagen o ícono */
  icon?: string;
  /** Duración sugerida en segundos */
  duration?: number;
}

export interface ModuleTutorial {
  /** ID del módulo (dashboard, sales, products, etc) */
  moduleId: string;
  /** Nombre mostrado */
  moduleName: string;
  /** Descripción breve */
  description: string;
  /** Ruta de la página del módulo (ej: /app/sales) */
  route?: string;
  /** Pasos del tutorial */
  steps: TutorialStep[];
  /** Ícono del módulo */
  icon?: string;
  /** Categoría */
  category: string;
  /** Duración total estimada en minutos */
  estimatedTime?: number;
}

export interface TutorialState {
  /** Tutorial activo */
  activeModuleId: string | null;
  /** Paso actual */
  currentStepIndex: number;
  /** Si está en progreso */
  isRunning: boolean;
  /** Pasos completados */
  completedSteps: string[];
}

export interface UserTutorialProgress {
  userId: string;
  moduleId: string;
  completedAt?: string;
  progress: number; // 0-100
  lastStepIndex: number;
}
