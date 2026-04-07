// ============================================================
// Setup Wizard Types
// ============================================================

export type SetupStep = 
  | 'welcome' 
  | 'company-info' 
  | 'payment-methods' 
  | 'initial-data' 
  | 'tutorial-choice' 
  | 'complete';

export interface CompanySetupData {
  name: string;
  cuit: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  industry: string;
}

export interface PaymentMethodSetup {
  cash: boolean;
  card: boolean;
  transfer: boolean;
  check: boolean;
  credit: boolean;
}

export interface InitialDataSetup {
  importProducts: boolean;
  importCustomers: boolean;
  importSampleData: boolean;
  importFile?: File;
}

export interface SetupWizardState {
  currentStep: SetupStep;
  completed: boolean;
  skipped: boolean;
  companyData: Partial<CompanySetupData>;
  paymentMethods: Partial<PaymentMethodSetup>;
  initialData: Partial<InitialDataSetup>;
  errorMessage?: string;
}

export interface SetupWizardContextType {
  state: SetupWizardState;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: SetupStep) => void;
  updateCompanyData: (data: Partial<CompanySetupData>) => void;
  updatePaymentMethods: (data: Partial<PaymentMethodSetup>) => void;
  updateInitialData: (data: Partial<InitialDataSetup>) => void;
  completeSetup: () => void;
  skipSetup: () => void;
  setError: (error: string) => void;
}

// Orden de pasos
export const SETUP_STEPS: SetupStep[] = [
  'welcome',
  'company-info',
  'payment-methods',
  'initial-data',
  'tutorial-choice',
  'complete',
];

export const getStepIndex = (step: SetupStep): number => {
  return SETUP_STEPS.indexOf(step);
};

export const getNextStep = (step: SetupStep): SetupStep | null => {
  const currentIndex = getStepIndex(step);
  return currentIndex < SETUP_STEPS.length - 1 
    ? SETUP_STEPS[currentIndex + 1] 
    : null;
};

export const getPreviousStep = (step: SetupStep): SetupStep | null => {
  const currentIndex = getStepIndex(step);
  return currentIndex > 0 
    ? SETUP_STEPS[currentIndex - 1] 
    : null;
};
