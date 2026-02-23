// ============================================================
// Onboarding Domain Types
// ============================================================

/** Ordered onboarding steps — state machine states */
export const ONBOARDING_STEPS = [
  'WELCOME',
  'BUSINESS_SETUP',
  'CREATE_FIRST_LEAD',
  'MOVE_PIPELINE',
  'ACTIVATE_AUTOMATION',
  'COMPLETED',
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

/** Events that trigger step advancement */
export const ONBOARDING_EVENTS = {
  'WELCOME': 'onboarding.welcome_acknowledged',
  'BUSINESS_SETUP': 'onboarding.business_configured',
  'CREATE_FIRST_LEAD': 'lead.created',
  'MOVE_PIPELINE': 'lead.stage_changed',
  'ACTIVATE_AUTOMATION': 'automation.enabled',
} as const;

export type OnboardingEvent = typeof ONBOARDING_EVENTS[keyof typeof ONBOARDING_EVENTS] | 'onboarding.completed';

/** Persisted onboarding state from DB */
export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  completedAt: string | null;
  startedAt?: string;
}

/** Step metadata for UI rendering */
export interface OnboardingStepConfig {
  step: OnboardingStep;
  title: string;
  description: string;
  /** The event name that completes this step */
  triggerEvent: string;
  /** Icon name from lucide-react */
  icon: string;
}

/** Full ordered step configuration */
export const ONBOARDING_STEP_CONFIGS: OnboardingStepConfig[] = [
  {
    step: 'WELCOME',
    title: 'Bienvenido a Ventify',
    description: 'Conocé cómo funciona la plataforma y preparate para activar tu negocio.',
    triggerEvent: 'onboarding.welcome_acknowledged',
    icon: 'Rocket',
  },
  {
    step: 'BUSINESS_SETUP',
    title: 'Configurá tu negocio',
    description: 'Completá los datos básicos de tu empresa: nombre, rubro y moneda.',
    triggerEvent: 'onboarding.business_configured',
    icon: 'Building2',
  },
  {
    step: 'CREATE_FIRST_LEAD',
    title: 'Creá tu primer contacto',
    description: 'Registrá un cliente o prospecto para empezar tu pipeline de ventas.',
    triggerEvent: 'lead.created',
    icon: 'UserPlus',
  },
  {
    step: 'MOVE_PIPELINE',
    title: 'Mové tu contacto en el pipeline',
    description: 'Arrastrá o cambiá la etapa de tu contacto para avanzar en el proceso de venta.',
    triggerEvent: 'lead.stage_changed',
    icon: 'ArrowRight',
  },
  {
    step: 'ACTIVATE_AUTOMATION',
    title: 'Activá una automatización',
    description: 'Habilitá una regla automática para agilizar tu flujo de trabajo.',
    triggerEvent: 'automation.enabled',
    icon: 'Zap',
  },
];

/** Transition map — which step comes after completing each step */
export const STEP_TRANSITIONS: Record<Exclude<OnboardingStep, 'COMPLETED'>, OnboardingStep> = {
  WELCOME: 'BUSINESS_SETUP',
  BUSINESS_SETUP: 'CREATE_FIRST_LEAD',
  CREATE_FIRST_LEAD: 'MOVE_PIPELINE',
  MOVE_PIPELINE: 'ACTIVATE_AUTOMATION',
  ACTIVATE_AUTOMATION: 'COMPLETED',
};

/** Check if a given step has been completed */
export function isStepCompleted(state: OnboardingState, step: OnboardingStep): boolean {
  return state.completedSteps.includes(step);
}

/** Check if onboarding is fully completed */
export function isOnboardingCompleted(state: OnboardingState): boolean {
  return state.currentStep === 'COMPLETED';
}

/** Get the index of a step in the sequence (0-based) */
export function getStepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

/** Get the total number of actionable steps (excludes COMPLETED) */
export function getTotalSteps(): number {
  return ONBOARDING_STEPS.length - 1; // exclude COMPLETED
}

/** Get progress as 0..1 */
export function getOnboardingProgress(state: OnboardingState): number {
  if (state.currentStep === 'COMPLETED') return 1;
  return state.completedSteps.length / getTotalSteps();
}
