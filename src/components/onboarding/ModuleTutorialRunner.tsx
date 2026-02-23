// ============================================================
// ModuleTutorialRunner — Runs tutorial steps for modules
// Reads pending tutorials from sessionStorage, shows FocusOverlay
// steps in sequence, marks viewed in DB.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FocusOverlay } from './FocusOverlay';
import { Button } from '@/components/ui/button';
import { useModuleTutorials } from '@/hooks/useModuleTutorials';
import {
  getTutorialByKey,
  MODULE_TUTORIALS,
  type ModuleTutorialConfig,
  type TutorialStep,
} from '@/lib/onboarding/moduleTutorials';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export function ModuleTutorialRunner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { markViewed } = useModuleTutorials();

  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [activeTutorial, setActiveTutorial] = useState<ModuleTutorialConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Load pending tutorials from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('pending_module_tutorials');
    if (raw) {
      try {
        const keys = JSON.parse(raw) as string[];
        setPendingKeys(keys);
      } catch {
        setPendingKeys([]);
      }
    }
  }, []);

  // Match current route to a pending tutorial
  useEffect(() => {
    if (pendingKeys.length === 0) return;
    if (activeTutorial) return; // already running

    const currentPath = location.pathname;
    const match = MODULE_TUTORIALS.find(
      (t) => pendingKeys.includes(t.key) && t.route === currentPath,
    );

    if (match) {
      setActiveTutorial(match);
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, [location.pathname, pendingKeys, activeTutorial]);

  const currentStep: TutorialStep | null =
    activeTutorial && activeTutorial.steps[currentStepIndex]
      ? activeTutorial.steps[currentStepIndex]
      : null;

  const totalSteps = activeTutorial?.steps.length ?? 0;
  const isLastStep = currentStepIndex >= totalSteps - 1;

  const finishTutorial = useCallback(() => {
    if (!activeTutorial) return;

    // Mark as viewed in DB
    markViewed(activeTutorial.key);

    // Remove from pending
    const remaining = pendingKeys.filter((k) => k !== activeTutorial.key);
    setPendingKeys(remaining);
    sessionStorage.setItem('pending_module_tutorials', JSON.stringify(remaining));

    setActiveTutorial(null);
    setCurrentStepIndex(0);
    setIsActive(false);

    // Navigate to next pending tutorial if any
    if (remaining.length > 0) {
      const next = getTutorialByKey(remaining[0]);
      if (next) {
        setTimeout(() => navigate(next.route), 300);
      }
    }
  }, [activeTutorial, pendingKeys, markViewed, navigate]);

  const handleNext = () => {
    if (isLastStep) {
      finishTutorial();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    // Close current tutorial, clear all pending
    setPendingKeys([]);
    sessionStorage.removeItem('pending_module_tutorials');
    setActiveTutorial(null);
    setCurrentStepIndex(0);
    setIsActive(false);
  };

  if (!isActive || !currentStep || !activeTutorial) return null;

  return (
    <FocusOverlay
      open={true}
      targetSelector={currentStep.targetSelector}
      tooltipPosition={currentStep.position}
      onClose={handleClose}
    >
      <div className="space-y-3">
        {/* Header with step counter and close */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {activeTutorial.label} — {currentStepIndex + 1}/{totalSteps}
          </span>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content */}
        <div>
          <h4 className="text-sm font-semibold text-foreground">{currentStep.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={currentStepIndex === 0}
            onClick={handlePrev}
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            Anterior
          </Button>
          <Button
            size="sm"
            className="h-8 px-4 text-xs font-medium"
            onClick={handleNext}
          >
            {isLastStep ? 'Finalizar' : 'Siguiente'}
            {!isLastStep && <ChevronRight className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      </div>
    </FocusOverlay>
  );
}
