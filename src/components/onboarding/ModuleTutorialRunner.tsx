// ============================================================
// ModuleTutorialRunner — Runs tutorial steps for modules
// Reads pending tutorials from sessionStorage, shows FocusOverlay
// steps in sequence, marks viewed in DB.
//
// Features:
// - Route normalization (trailing slash tolerant)
// - Keyboard navigation (arrows, Escape)
// - Step dots indicator + progress bar
// - Skip current module (move to next)
// - SessionStorage sync across tabs/re-navigations
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FocusOverlay } from './FocusOverlay';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useModuleTutorials } from '@/hooks/useModuleTutorials';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  getTutorialByKey,
  MODULE_TUTORIALS,
  type ModuleTutorialConfig,
  type TutorialStep,
} from '@/lib/onboarding/moduleTutorials';
import { cn } from '@/lib/utils';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';

/** Normalize path for comparison — strip trailing slash */
function normPath(p: string): string {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

export function ModuleTutorialRunner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { markViewed } = useModuleTutorials();
  const { isCompleted } = useOnboarding();

  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [activeTutorial, setActiveTutorial] = useState<ModuleTutorialConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  /** Prevents double-fire of finishTutorial / handleSkipModule */
  const transitioningRef = useRef(false);
  /** Counter bumped by custom event to force re-read sessionStorage */
  const [reloadTick, setReloadTick] = useState(0);

  // Listen for manual tutorial trigger from any page
  useEffect(() => {
    const handler = () => setReloadTick((t) => t + 1);
    window.addEventListener('start-module-tutorial', handler);
    return () => window.removeEventListener('start-module-tutorial', handler);
  }, []);

  // Load pending tutorials from sessionStorage — only after onboarding is completed
  useEffect(() => {
    if (!isCompleted) {
      setPendingKeys([]);
      return;
    }
    const raw = sessionStorage.getItem('pending_module_tutorials');
    if (raw) {
      try {
        const keys = JSON.parse(raw) as string[];
        setPendingKeys(keys);
      } catch {
        setPendingKeys([]);
      }
    } else {
      setPendingKeys([]);
    }
  }, [location.pathname, isCompleted, reloadTick]);

  // Match current route to a pending tutorial
  useEffect(() => {
    if (pendingKeys.length === 0) return;
    if (activeTutorial) return; // already running

    const currentPath = normPath(location.pathname);
    const match = MODULE_TUTORIALS.find(
      (t) => pendingKeys.includes(t.key) && normPath(t.route) === currentPath,
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
  const progressPct = totalSteps > 0 ? Math.round(((currentStepIndex + 1) / totalSteps) * 100) : 0;

  // How many pending tutorials remain (including current)
  const remainingCount = pendingKeys.length;

  const finishTutorial = useCallback(() => {
    if (!activeTutorial || transitioningRef.current) return;
    transitioningRef.current = true;

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
        setTimeout(() => {
          navigate(next.route);
          transitioningRef.current = false;
        }, 300);
      } else {
        transitioningRef.current = false;
      }
    } else {
      transitioningRef.current = false;
    }
  }, [activeTutorial, pendingKeys, markViewed, navigate]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      finishTutorial();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLastStep, finishTutorial]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  /** Skip only the current module tutorial, move to next pending */
  const handleSkipModule = useCallback(() => {
    if (!activeTutorial || transitioningRef.current) return;
    transitioningRef.current = true;

    const remaining = pendingKeys.filter((k) => k !== activeTutorial.key);
    setPendingKeys(remaining);
    sessionStorage.setItem('pending_module_tutorials', JSON.stringify(remaining));

    setActiveTutorial(null);
    setCurrentStepIndex(0);
    setIsActive(false);

    if (remaining.length > 0) {
      const next = getTutorialByKey(remaining[0]);
      if (next) {
        setTimeout(() => {
          navigate(next.route);
          transitioningRef.current = false;
        }, 300);
      } else {
        transitioningRef.current = false;
      }
    } else {
      transitioningRef.current = false;
    }
  }, [activeTutorial, pendingKeys, navigate]);

  /** Close all tutorials */
  const handleClose = useCallback(() => {
    transitioningRef.current = false;
    setPendingKeys([]);
    sessionStorage.removeItem('pending_module_tutorials');
    setActiveTutorial(null);
    setCurrentStepIndex(0);
    setIsActive(false);
  }, []);

  if (!isActive || !currentStep || !activeTutorial) return null;

  return (
    <FocusOverlay
      open={true}
      targetSelector={currentStep.targetSelector}
      tooltipPosition={currentStep.position}
      onClose={handleClose}
      onNext={handleNext}
      onPrev={handlePrev}
    >
      <div className="space-y-3">
        {/* Header with module label, step counter and close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {activeTutorial.label} — {currentStepIndex + 1}/{totalSteps}
            </span>
            {remainingCount > 1 && (
              <span className="text-[10px] text-muted-foreground/60 bg-muted rounded-full px-1.5 py-0.5">
                +{remainingCount - 1} más
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <Progress value={progressPct} className="h-1" />

        {/* Step dots */}
        {totalSteps > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {activeTutorial.steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === currentStepIndex
                    ? 'w-4 bg-primary'
                    : i < currentStepIndex
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-muted-foreground/25',
                )}
              />
            ))}
          </div>
        )}

        {/* Step content */}
        <div>
          <h4 className="text-sm font-semibold text-foreground">{currentStep.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Next steps */}
        {currentStep.nextSteps && currentStep.nextSteps.length > 0 && (
          <div className="rounded-md bg-muted/50 border border-border/50 p-2.5">
            <span className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wide">
              Próximos pasos
            </span>
            <ul className="mt-1.5 space-y-1">
              {currentStep.nextSteps.map((ns, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary mt-0.5 shrink-0">›</span>
                  {ns}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Keyboard hint */}
        <p className="text-[10px] text-muted-foreground/50 text-center">
          ← → para navegar · Esc para cerrar
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
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
            {remainingCount > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={handleSkipModule}
                title="Saltar este módulo"
              >
                <SkipForward className="w-3 h-3 mr-1" />
                Saltar
              </Button>
            )}
          </div>
          <Button
            size="sm"
            className="h-8 px-4 text-xs font-medium"
            onClick={handleNext}
          >
            {isLastStep ? (remainingCount > 1 ? 'Siguiente módulo' : 'Finalizar') : 'Siguiente'}
            {!isLastStep && <ChevronRight className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      </div>
    </FocusOverlay>
  );
}
