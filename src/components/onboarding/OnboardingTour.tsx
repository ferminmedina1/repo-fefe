// ============================================================
// OnboardingTour — Non-blocking guided tour overlay.
// Navigates through the real app, highlighting real elements
// with FocusOverlay + tooltip.  Advances the DB state machine
// at the end of each phase.
//
// Includes a soft re-orientation system: when the user goes
// back to a step whose phase is already completed, we show a
// summary panel with options instead of the normal tooltip.
// ============================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { FocusOverlay } from './FocusOverlay';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TOUR_STEPS,
  getTotalTourSteps,
  type TourStep,
} from '@/lib/onboarding/tourSteps';
import {
  ONBOARDING_STEP_CONFIGS,
  ONBOARDING_STEPS,
  type OnboardingStep,
} from '@/lib/onboarding';
import {
  ChevronRight,
  ChevronLeft,
  X,
  MapPin,
  CheckCircle2,
  Eye,
  ArrowRight,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────

/** Index of a phase in the ONBOARDING_STEPS sequence (0-based) */
function phaseIndex(phase: string): number {
  return ONBOARDING_STEPS.indexOf(phase as OnboardingStep);
}

/** Friendly phase label for the summary */
const PHASE_LABELS: Record<string, string> = {
  WELCOME: 'Bienvenida',
  BUSINESS_SETUP: 'Configuración',
  CREATE_FIRST_LEAD: 'Primer contacto',
  MOVE_PIPELINE: 'Ventas',
  ACTIVATE_AUTOMATION: 'Exploración',
};

// ── component ────────────────────────────────────────────────

export function OnboardingTour() {
  const { state, emitEvent } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  /** User permanently closed the badge for this session */
  const [closed, setClosed] = useState(false);
  /** The user is reviewing a completed step — show re-orientation */
  const [reviewing, setReviewing] = useState(false);
  /** Phase advancement in progress — disables navigation */
  const [advancing, setAdvancing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const currentPhase = state?.currentStep as string | undefined;
  const completedPhases = useMemo(
    () => state?.completedSteps ?? [],
    [state?.completedSteps],
  );

  // Compute the "home" index — the first step of the current DB phase
  const homeIndex = useMemo(() => {
    if (!currentPhase || currentPhase === 'COMPLETED') return 0;
    const idx = TOUR_STEPS.findIndex((s) => s.phase === currentPhase);
    return idx >= 0 ? idx : 0;
  }, [currentPhase]);

  // Safety timeout: if DB doesn't respond in 5 s, unlock the button
  useEffect(() => {
    if (!advancing) return;
    const t = setTimeout(() => setAdvancing(false), 5000);
    return () => clearTimeout(t);
  }, [advancing]);

  // Sync to DB phase on mount / phase change
  useEffect(() => {
    if (!currentPhase || currentPhase === 'COMPLETED') return;
    setAdvancing(false); // phase changed → no longer waiting

    // Only snap if we're NOT already viewing the correct phase
    const viewing = TOUR_STEPS[currentIndex];
    if (viewing?.phase === currentPhase) return;

    setCurrentIndex(homeIndex);
    setReviewing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase]);

  const step: TourStep | undefined = TOUR_STEPS[currentIndex];
  const total = getTotalTourSteps();
  const progress = Math.round(((currentIndex + 1) / total) * 100);

  // Is the user looking at a step whose phase was already completed?
  const isInCompletedPhase = step
    ? completedPhases.includes(step.phase as OnboardingStep)
    : false;

  // Navigate to step route if needed, then poll for element
  // FIX: properly clean up both outer timeout AND inner interval
  useEffect(() => {
    if (!step || dismissed) return;
    setReady(false);

    if (location.pathname !== step.route) {
      navigate(step.route);
    }

    const delay = step.delay ?? 300;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let maxPollTimeout: ReturnType<typeof setTimeout> | null = null;

    timerRef.current = setTimeout(() => {
      pollInterval = setInterval(() => {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          if (pollInterval) clearInterval(pollInterval);
          if (maxPollTimeout) clearTimeout(maxPollTimeout);
          setReady(true);
        }
      }, 100);
      // Give up polling after 5s and show anyway
      maxPollTimeout = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        setReady(true);
      }, 5000);
    }, delay);

    return () => {
      clearTimeout(timerRef.current);
      if (pollInterval) clearInterval(pollInterval);
      if (maxPollTimeout) clearTimeout(maxPollTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, dismissed]);

  // ── navigation callbacks ───────────────────────────────────

  const goNext = useCallback(() => {
    if (!step || advancing) return;

    // ── reviewing mode ──
    if (reviewing) {
      const nextIdx = currentIndex + 1;
      if (nextIdx < total) {
        const nextStep = TOUR_STEPS[nextIdx];
        if (completedPhases.includes(nextStep.phase as OnboardingStep)) {
          setCurrentIndex(nextIdx);
          return;
        }
      }
      // Snap back to current progress
      setCurrentIndex(homeIndex);
      setReviewing(false);
      return;
    }

    // ── phase-advance step: lock UI, emit event, wait for DB ──
    if (step.advancesPhase) {
      setAdvancing(true);
      const config = ONBOARDING_STEP_CONFIGS.find(
        (c) => c.step === step.phase,
      );
      if (config) {
        emitEvent(config.triggerEvent);
      }
      // Don't increment index — useEffect on currentPhase will set the right index
      return;
    }

    // ── normal step: just move forward ──
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [step, currentIndex, total, emitEvent, reviewing, homeIndex, completedPhases, advancing]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0 || advancing) return;

    const prevIdx = currentIndex - 1;
    const prevStep = TOUR_STEPS[prevIdx];

    // Going back into a completed phase? Activate re-orientation.
    if (
      !reviewing &&
      completedPhases.includes(prevStep.phase as OnboardingStep)
    ) {
      setReviewing(true);
    }

    setCurrentIndex(prevIdx);
  }, [currentIndex, reviewing, completedPhases, advancing]);

  /** Jump straight back to current progress */
  const jumpToCurrentProgress = useCallback(() => {
    setCurrentIndex(homeIndex);
    setReviewing(false);
  }, [homeIndex]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleResume = useCallback(() => {
    setDismissed(false);
  }, []);

  // ── guards ─────────────────────────────────────────────────

  if (!state || state.currentStep === 'COMPLETED') return null;
  if (!step) return null;

  // Minimised badge — positioned bottom-left to avoid overlapping the AI assistant (bottom-right)
  if (dismissed) {
    // If user clicked X, hide everything for this session
    if (closed) return null;

    return (
      <div
        className="fixed bottom-6 right-24 z-[9999] flex items-center gap-1.5"
        style={{ animation: 'tourBadgeIn 200ms ease-out' }}
      >
        <button
          onClick={handleResume}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-4 pr-3 py-2.5 shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
        >
          <MapPin className="w-4 h-4" />
          Continuar tour ({currentIndex + 1}/{total})
        </button>
        <button
          onClick={() => setClosed(true)}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-muted/80 hover:bg-destructive/90 hover:text-white text-muted-foreground transition-colors shadow-md"
          title="Cerrar tour"
          aria-label="Cerrar tour"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <style>{`
          @keyframes tourBadgeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === total - 1;

  // ── RE-ORIENTATION panel ───────────────────────────────────
  // Shown when the user navigated back into an already-completed phase.
  if (isInCompletedPhase && reviewing) {
    const currentPhaseLabel = PHASE_LABELS[currentPhase ?? ''] ?? currentPhase;
    const stepPhaseLabel = PHASE_LABELS[step.phase] ?? step.phase;

    return (
      <FocusOverlay
        open={ready}
        targetSelector={step.targetSelector}
        tooltipPosition={step.position}
        onClose={handleDismiss}
        onNext={goNext}
        onPrev={goPrev}
      >
        <div className="space-y-3" style={{ minWidth: 300, maxWidth: 360 }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500">
              Revisando paso anterior
            </span>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors -mr-1"
              title="Minimizar tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current position reminder */}
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs leading-relaxed">
            <p className="font-medium text-foreground">
              Tu progreso actual: <span className="text-primary">{currentPhaseLabel}</span>
            </p>
            <p className="text-muted-foreground mt-0.5">
              Estás revisando <strong>{stepPhaseLabel}</strong>, que ya completaste.
            </p>
          </div>

          {/* Summary of completed phases */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Resumen completado:</span>
            {completedPhases.map((phase) => (
              <div key={phase} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span className="text-foreground">{PHASE_LABELS[phase] ?? phase}</span>
              </div>
            ))}
          </div>

          {/* Step content (light preview) */}
          <div className="border-l-2 border-primary/30 pl-3">
            <h4 className="font-semibold text-sm leading-tight">{step.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Navigation options */}
          <div className="flex flex-col gap-1.5 pt-1">
            <Button
              size="sm"
              onClick={jumpToCurrentProgress}
              className="text-xs h-8 w-full justify-start gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Ir a mi progreso actual
            </Button>
            <div className="flex items-center gap-1.5">
              {currentIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goPrev}
                  className="text-xs h-8 flex-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Anterior
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                className="text-xs h-8 flex-1"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {(() => {
                  const nIdx = currentIndex + 1;
                  if (nIdx < total && completedPhases.includes(TOUR_STEPS[nIdx].phase as OnboardingStep)) {
                    return 'Seguir revisando';
                  }
                  return 'Ir a mi progreso';
                })()}
              </Button>
            </div>
          </div>
        </div>
      </FocusOverlay>
    );
  }

  // ── NORMAL step tooltip ────────────────────────────────────

  // Build step dots for current phase
  const phaseSteps = TOUR_STEPS.filter((s) => s.phase === step.phase);
  const phaseStepIndex = phaseSteps.findIndex((s) => s.id === step.id);

  return (
    <FocusOverlay
      open={ready}
      targetSelector={step.targetSelector}
      tooltipPosition={step.position}
      onClose={handleDismiss}
      onNext={goNext}
      onPrev={goPrev}
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

        {/* Phase step dots */}
        {phaseSteps.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {phaseSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  i === phaseStepIndex
                    ? 'w-4 bg-primary'
                    : i < phaseStepIndex
                    ? 'bg-primary/40'
                    : 'bg-muted-foreground/25',
                )}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div>
          <h3 className="font-semibold text-sm leading-tight">{step.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-muted-foreground/50 text-center">
          ← → para navegar · Esc para minimizar
        </p>

        {/* Navigation */}
        <div className="flex items-center gap-2 pt-1">
          {!isFirstStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={advancing}
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
            disabled={advancing}
            className="text-xs h-8"
          >
            {advancing ? (
              <>
                <span className="w-3 h-3 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                Guardando…
              </>
            ) : (
              <>
                {step.actionLabel ?? (isLastStep ? 'Finalizar' : 'Siguiente')}
                {!isLastStep && !step.actionLabel && <ChevronRight className="w-3.5 h-3.5 ml-1" />}
              </>
            )}
          </Button>
        </div>
      </div>
    </FocusOverlay>
  );
}
