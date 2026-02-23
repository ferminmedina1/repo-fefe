// ============================================================
// OnboardingGate — Non-blocking wrapper.
// Always renders children (the real app). Overlays the guided
// tour on top when onboarding is not yet completed.
// ============================================================

import { type ReactNode } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingTour } from './OnboardingTour';
import { ModuleTutorialSelector } from './ModuleTutorialSelector';
import { ModuleTutorialRunner } from './ModuleTutorialRunner';

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { loading, error, isCompleted, showModuleSelector } = useOnboarding();

  // While loading, show a minimal loader (don't start app yet)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Always render the real app */}
      {children}

      {/* Overlay: guided tour when onboarding not completed */}
      {!error && !isCompleted && <OnboardingTour />}

      {/* Module selector (shown right after completing the tour) */}
      {showModuleSelector && <ModuleTutorialSelector />}

      {/* Per-module guided tutorials */}
      <ModuleTutorialRunner />
    </>
  );
}
