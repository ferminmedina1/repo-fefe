// ============================================================
// OnboardingTour — Non-blocking guided tour overlay.
// Navigates through the real app, highlighting real elements
// with FocusOverlay + tooltip.  Advances the DB state machine
// at the end of each phase.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { FocusOverlay } from './FocusOverlay';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TOUR_STEPS,
  getTotalTourSteps,
  type TourStep,
} from '@/lib/onboarding/tourSteps';
import {
  ONBOARDING_STEP_CONFIGS,
  type OnboardingStep,
} from '@/lib/onboarding';
import {
  ChevronRight,
  ChevronLeft,
  X,
  MapPin,
} from 'lucide-react';

export function OnboardingTour() {
  const { state, emitEvent } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();

  // Flatten TOUR_STEPS into a single ordered list
  // Filter to only show steps from the current phase onward
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Derive the slice of steps we should show:
  // Start from the first step of the current DB phase.
  const currentPhase = state?.currentStep as string | undefined;

  // Find the first step of the current phase
  useEffect(() => {
    if (!currentPhase || currentPhase === 'COMPLETED') return;
    const idx = TOUR_STEPS.findIndex((s) => s.phase === currentPhase);
    if (idx >= 0 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase]);

  const step: TourStep | undefined = TOUR_STEPS[currentIndex];
  const total = getTotalTourSteps();
  const progress = Math.round(((currentIndex + 1) / total) * 100);

  // Navigate to step route if needed, then wait for the element
  useEffect(() => {
    if (!step || dismissed) return;
    setReady(false);

    if (location.pathname !== step.route) {
      navigate(step.route);
    }

    // Wait for navigation / lazy page render, then poll for element
    const delay = step.delay ?? 300;
    timerRef.current = setTimeout(() => {
      const pollInterval = setInterval(() => {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          clearInterval(pollInterval);
          setReady(true);
        }
      }, 100);
      // Safety: give up after 5s
      setTimeout(() => {
        clearInterval(pollInterval);
        setReady(true); // show tooltip centered even if selector not found
      }, 5000);
    }, delay);

    return () => {
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, dismissed]);

  const goNext = useCallback(() => {
    if (!step) return;

    // If this step advances the phase, emit the trigger event
    if (step.advancesPhase) {
      const config = ONBOARDING_STEP_CONFIGS.find(
        (c) => c.step === step.phase,
      );
      if (config) {
        emitEvent(config.triggerEvent);
      }
    }

    // Move to next step
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [step, currentIndex, total, emitEvent]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleResume = useCallback(() => {
    setDismissed(false);
  }, []);

  // Don't render if state not loaded or completed
  if (!state || state.currentStep === 'COMPLETED') return null;
  if (!step) return null;

  // Minimised floating badge when dismissed
  if (dismissed) {
    return (
      <button
        onClick={handleResume}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
        style={{ animation: 'tourBadgeIn 200ms ease-out' }}
      >
        <MapPin className="w-4 h-4" />
        Continuar tour ({currentIndex + 1}/{total})
        <style>{`
          @keyframes tourBadgeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </button>
    );
  }

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === total - 1;

  return (
    <FocusOverlay
      open={ready}
      targetSelector={step.targetSelector}
      tooltipPosition={step.position}
    >
      <div className="space-y-3" style={{ minWidth: 280 }}>
        {/* Header with step counter and dismiss */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            Paso {currentIndex + 1} de {total}
          </span>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors -mr-1"
            title="Minimizar tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-1.5" />

        {/* Content */}
        <div>
          <h3 className="font-semibold text-sm leading-tight">{step.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 pt-1">
          {!isFirstStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              className="text-xs h-8"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Anterior
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={goNext}
            className="text-xs h-8"
          >
            {step.actionLabel ?? (isLastStep ? 'Finalizar' : 'Siguiente')}
            {!isLastStep && !step.actionLabel && <ChevronRight className="w-3.5 h-3.5 ml-1" />}
          </Button>
        </div>
      </div>
    </FocusOverlay>
  );
}
