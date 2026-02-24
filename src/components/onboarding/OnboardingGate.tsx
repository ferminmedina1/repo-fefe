// ============================================================
// OnboardingGate — Non-blocking wrapper.
// Always renders children (the real app). Overlays the guided
// tour on top when onboarding is not yet completed.
// Shows a subtle loading indicator instead of blocking the UI.
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

  return (
    <>
      {/* Always render the real app — never block */}
      {children}

      {/* Subtle loading indicator (non-blocking) */}
      {loading && (
        <div className="fixed top-3 right-3 z-[9990] flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 shadow-lg">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Cargando onboarding…</span>
        </div>
      )}

      {/* Overlay: guided tour when onboarding not completed */}
      {!loading && !error && !isCompleted && <OnboardingTour />}

      {/* Module selector (shown right after completing the tour) */}
      {showModuleSelector && <ModuleTutorialSelector />}

      {/* Per-module guided tutorials */}
      <ModuleTutorialRunner />
    </>
  );
}
