// ============================================================
// OnboardingFlow — Full-screen mandatory onboarding overlay
// Renders the current step with guidance and waits for the
// real user action to advance (no manual skip).
// ============================================================

import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingStepWelcome } from './steps/OnboardingStepWelcome';
import { OnboardingStepBusinessSetup } from './steps/OnboardingStepBusinessSetup';
import { OnboardingStepCreateLead } from './steps/OnboardingStepCreateLead';
import { OnboardingStepMovePipeline } from './steps/OnboardingStepMovePipeline';
import { OnboardingStepActivateAutomation } from './steps/OnboardingStepActivateAutomation';
import { Progress } from '@/components/ui/progress';
import {
  ONBOARDING_STEP_CONFIGS,
  getStepIndex,
  getTotalSteps,
  type OnboardingStep,
} from '@/lib/onboarding';
import { CheckCircle2 } from 'lucide-react';

const STEP_COMPONENTS: Record<string, React.ComponentType> = {
  WELCOME: OnboardingStepWelcome,
  BUSINESS_SETUP: OnboardingStepBusinessSetup,
  CREATE_FIRST_LEAD: OnboardingStepCreateLead,
  MOVE_PIPELINE: OnboardingStepMovePipeline,
  ACTIVATE_AUTOMATION: OnboardingStepActivateAutomation,
};

export function OnboardingFlow() {
  const { state, loading, isCompleted, progress } = useOnboarding();

  if (loading || !state || isCompleted) return null;

  const currentStep = state.currentStep;
  const StepComponent = STEP_COMPONENTS[currentStep];
  const stepIndex = getStepIndex(currentStep);
  const totalSteps = getTotalSteps();
  const progressPercent = Math.round(progress * 100);

  return (
    <div className="fixed inset-0 z-[9990] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Top progress bar */}
      <div className="px-6 pt-6 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">
              Paso {stepIndex + 1} de {totalSteps}
            </span>
            <span className="text-sm text-slate-400">
              {progressPercent}% completado
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {/* Step indicators */}
          <div className="flex items-center justify-between mt-4 gap-2">
            {ONBOARDING_STEP_CONFIGS.map((config, idx) => {
              const isActive = config.step === currentStep;
              const isDone = state.completedSteps.includes(config.step);
              return (
                <div
                  key={config.step}
                  className="flex items-center gap-1.5 flex-1"
                >
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 shrink-0
                      ${isDone ? 'bg-primary text-primary-foreground' : ''}
                      ${isActive ? 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-slate-900' : ''}
                      ${!isDone && !isActive ? 'bg-slate-700 text-slate-500' : ''}
                    `}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  {idx < ONBOARDING_STEP_CONFIGS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 rounded transition-colors duration-200 ${
                        isDone ? 'bg-primary' : 'bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto">
        <div
          className="w-full max-w-2xl"
          style={{ animation: 'onboardingStepIn 200ms ease-out' }}
        >
          {StepComponent ? <StepComponent /> : null}
        </div>
      </div>

      <style>{`
        @keyframes onboardingStepIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
