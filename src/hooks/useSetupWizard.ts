// ============================================================
// Setup Wizard Hook
// ============================================================

import { useState, useCallback } from 'react';
import {
  SetupWizardState,
  CompanySetupData,
  PaymentMethodSetup,
  InitialDataSetup,
  SetupStep,
  getNextStep,
  getPreviousStep,
} from '@/lib/setup/types';

const INITIAL_STATE: SetupWizardState = {
  currentStep: 'welcome',
  completed: false,
  skipped: false,
  companyData: {},
  paymentMethods: {},
  initialData: {},
  errorMessage: undefined,
};

export const useSetupWizard = () => {
  const [state, setState] = useState<SetupWizardState>(INITIAL_STATE);

  const nextStep = useCallback(() => {
    const next = getNextStep(state.currentStep);
    if (next) {
      setState(prev => ({
        ...prev,
        currentStep: next,
        errorMessage: undefined,
      }));
    }
  }, [state.currentStep]);

  const previousStep = useCallback(() => {
    const prev = getPreviousStep(state.currentStep);
    if (prev) {
      setState(prev => ({
        ...prev,
        currentStep: prev,
        errorMessage: undefined,
      }));
    }
  }, [state.currentStep]);

  const goToStep = useCallback((step: SetupStep) => {
    setState(prev => ({
      ...prev,
      currentStep: step,
      errorMessage: undefined,
    }));
  }, []);

  const updateCompanyData = useCallback((data: Partial<CompanySetupData>) => {
    setState(prev => ({
      ...prev,
      companyData: { ...prev.companyData, ...data },
      errorMessage: undefined,
    }));
  }, []);

  const updatePaymentMethods = useCallback((data: Partial<PaymentMethodSetup>) => {
    setState(prev => ({
      ...prev,
      paymentMethods: { ...prev.paymentMethods, ...data },
      errorMessage: undefined,
    }));
  }, []);

  const updateInitialData = useCallback((data: Partial<InitialDataSetup>) => {
    setState(prev => ({
      ...prev,
      initialData: { ...prev.initialData, ...data },
      errorMessage: undefined,
    }));
  }, []);

  const completeSetup = useCallback(async () => {
    try {
      // Validar datos mínimos
      if (!state.companyData.name || state.companyData.name.trim() === '') {
        setError('El nombre de la empresa es requerido');
        return;
      }

      // Aquí iría la lógica para guardar en BD
      setState(prev => ({
        ...prev,
        currentStep: 'complete',
        completed: true,
        errorMessage: undefined,
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al completar setup');
    }
  }, [state.companyData]);

  const skipSetup = useCallback(() => {
    setState(prev => ({
      ...prev,
      skipped: true,
      completed: true,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      errorMessage: error,
    }));
  }, []);

  return {
    state,
    nextStep,
    previousStep,
    goToStep,
    updateCompanyData,
    updatePaymentMethods,
    updateInitialData,
    completeSetup,
    skipSetup,
    setError,
  };
};
