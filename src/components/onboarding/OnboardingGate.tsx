// ============================================================
// OnboardingGate — Feature gating middleware component
// Blocks access to the app while onboarding != COMPLETED.
// Renders the OnboardingFlow overlay instead.
// ============================================================

import { type ReactNode } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingFlow } from './OnboardingFlow';
import { ModuleTutorialSelector } from './ModuleTutorialSelector';
import { ModuleTutorialRunner } from './ModuleTutorialRunner';

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { loading, isCompleted, showModuleSelector } = useOnboarding();

  // While loading, show a minimal loader (not the onboarding flow)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Onboarding not completed — block everything, show the flow
  if (!isCompleted) {
    return <OnboardingFlow />;
  }

  // Module selector screen (shown right after completion)
  if (showModuleSelector) {
    return <ModuleTutorialSelector />;
  }

  // Normal app + tutorial runner overlay
  return (
    <>
      {children}
      <ModuleTutorialRunner />
    </>
  );
}
