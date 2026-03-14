// ============================================================
// Setup Wizard - Main Page
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupWizard } from '@/hooks/useSetupWizard';
import { useTutorial } from '@/hooks/useTutorial';
import { WelcomeStep } from './WelcomeStep';
import { CompanyInfoStep } from './CompanyInfoStep';
import { PaymentMethodsStep } from './PaymentMethodsStep';
import { InitialDataStep } from './InitialDataStep';
import { TutorialChoiceStep } from './TutorialChoiceStep';
import { CompleteStep } from './CompleteStep';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SETUP_STEPS, getStepIndex } from '@/lib/setup/types';

export function SetupWizardPage() {
  const navigate = useNavigate();
  const {
    state,
    nextStep,
    previousStep,
    updateCompanyData,
    updatePaymentMethods,
    updateInitialData,
    completeSetup,
    skipSetup,
  } = useSetupWizard();
  
  const { startTutorial } = useTutorial();

  const currentStepIndex = getStepIndex(state.currentStep);
  const progressPercent = ((currentStepIndex + 1) / SETUP_STEPS.length) * 100;

  const handleFinish = () => {
    navigate('/app');
  };

  const handleStartTutorial = async () => {
    await completeSetup();
    startTutorial('dashboard'); // Inicia tutorial del dashboard
    navigate('/learning-center');
  };

  if (state.skipped || state.completed) {
    return null; // El wizard se oculta una vez completado
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Setup Inicial
            </div>
            <p className="text-xs text-muted-foreground">
              Paso {currentStepIndex + 1} de {SETUP_STEPS.length}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Content Card */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <div className="p-8 md:p-12">
              {state.currentStep === 'welcome' && (
                <WelcomeStep
                  onNext={nextStep}
                  onSkip={skipSetup}
                />
              )}

              {state.currentStep === 'company-info' && (
                <CompanyInfoStep
                  data={state.companyData}
                  onUpdate={updateCompanyData}
                  onNext={nextStep}
                  onPrevious={previousStep}
                  error={state.errorMessage}
                />
              )}

              {state.currentStep === 'payment-methods' && (
                <PaymentMethodsStep
                  data={state.paymentMethods}
                  onUpdate={updatePaymentMethods}
                  onNext={nextStep}
                  onPrevious={previousStep}
                />
              )}

              {state.currentStep === 'initial-data' && (
                <InitialDataStep
                  data={state.initialData}
                  onUpdate={updateInitialData}
                  onNext={nextStep}
                  onPrevious={previousStep}
                />
              )}

              {state.currentStep === 'tutorial-choice' && (
                <TutorialChoiceStep
                  onStartTutorial={handleStartTutorial}
                  onSkipTutorial={async () => {
                    await completeSetup();
                    handleFinish();
                  }}
                  onPrevious={previousStep}
                />
              )}

              {state.currentStep === 'complete' && (
                <CompleteStep
                  onFinish={handleFinish}
                  onStartTutorial={() => {
                    startTutorial('dashboard');
                    navigate('/learning-center');
                  }}
                />
              )}
            </div>
          </Card>

          {/* Footer Help */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>¿Necesitas ayuda? Contacta con soporte en support@dsfp-space.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
