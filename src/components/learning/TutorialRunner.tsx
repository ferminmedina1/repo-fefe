import React, { useEffect, useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps, ACTIONS, EVENTS } from 'react-joyride';
import { useTutorial } from '@/hooks/useTutorial';
import { Button } from '@/components/ui/button';
import {
  ChevronRight, ChevronLeft, X, SkipForward,
  Minimize2, Maximize2, CheckCircle2, Zap, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// Step dots progress indicator
// ─────────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  // Only render dots if <= 10 steps, else use bar
  if (total > 10) {
    const progress = Math.round(((current + 1) / total) * 100);
    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-semibold text-muted-foreground">
            Paso {current + 1} de {total}
          </span>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">
            {progress}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground">
          Paso {current + 1} de {total}
        </span>
        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">
          {Math.round(((current + 1) / total) * 100)}%
        </span>
      </div>
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all duration-300',
              i === current
                ? 'w-5 h-2 bg-primary shadow-sm shadow-primary/50'
                : i < current
                  ? 'w-2 h-2 bg-primary/50'
                  : 'w-2 h-2 bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mini floating bar — appears when tooltip is minimized
// ─────────────────────────────────────────────────────────────
interface MiniBarProps {
  stepTitle: string;
  stepAction?: string;
  stepIndex: number;
  totalSteps: number;
  tutorialName: string;
  onExpand: () => void;
  onNext: () => void;
  isLastStep: boolean;
}

const MiniBar = ({
  stepTitle, stepAction, stepIndex, totalSteps, tutorialName, onExpand, onNext, isLastStep
}: MiniBarProps) => {
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001]',
        'flex items-center gap-3 pl-3 pr-2 py-2 rounded-2xl',
        'bg-background/95 border border-border/80 backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(0,0,0,0.18)]',
        'animate-in slide-in-from-bottom-3 duration-300 ease-out'
      )}
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      {/* Progress ring / badge */}
      <div className="relative shrink-0 w-9 h-9">
        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/40" />
          <circle
            cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeDasharray={`${progress * 0.942} 94.2`}
            strokeLinecap="round"
            className="text-primary transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
          {stepIndex + 1}
        </span>
      </div>

      {/* Text content */}
      <div className="flex flex-col min-w-0 max-w-[220px]">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-0.5 truncate">
          {stepAction ? '⚡ Tu turno ahora' : tutorialName}
        </span>
        <span className="text-sm font-semibold text-foreground truncate leading-tight">
          {stepAction || stepTitle}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border/60 shrink-0" />

      {/* Expand */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onExpand}
        className="h-8 w-8 shrink-0 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        title="Ver instrucciones completas"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      {/* Done button */}
      <Button
        onClick={onNext}
        size="sm"
        className={cn(
          'h-8 px-3 rounded-xl text-xs font-bold shrink-0 transition-all gap-1.5',
          isLastStep
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 shadow-md'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25 shadow-md'
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {isLastStep ? 'Finalizar' : 'Listo ✓'}
      </Button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────────────────────
interface ExtendedTooltipProps extends TooltipRenderProps {
  minimized: boolean;
  onMinimize: () => void;
}

const CustomTooltip = ({
  index,
  step,
  tooltipProps,
  primaryProps,
  backProps,
  skipProps,
  closeProps,
  isLastStep,
  minimized,
  onMinimize,
}: ExtendedTooltipProps) => {
  const { getCurrentTutorial } = useTutorial();
  const tutorial = getCurrentTutorial();
  const totalSteps = tutorial?.steps.length || 0;
  const originalStep = tutorial?.steps[index];

  if (minimized) return null;

  const hasAction = !!originalStep?.action;

  return (
    <div
      {...tooltipProps}
      className={cn(
        'relative w-[360px] max-w-[calc(100vw-32px)]',
        'bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden',
        'border border-border/60',
        'shadow-[0_20px_60px_rgba(0,0,0,0.25)]',
        'animate-in fade-in-0 zoom-in-95 duration-200 ease-out'
      )}
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4 pr-14">
          {/* Step number badge */}
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            'bg-gradient-to-br from-primary/20 to-primary/5',
            'border border-primary/20 shadow-sm'
          )}>
            <span className="text-sm font-bold text-primary tabular-nums leading-none">{index + 1}</span>
          </div>

          {/* Title */}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
              {tutorial?.moduleName}
            </p>
            <h3 className="text-base font-bold text-foreground leading-snug">
              {originalStep?.title || step.title}
            </h3>
          </div>
        </div>

        {/* Control buttons — absolute positioned */}
        <div className="absolute top-[calc(3px+12px)] right-3 flex items-center gap-1">
          {hasAction && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize}
              className="h-7 w-7 rounded-lg text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Minimizar para hacer la acción"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            {...closeProps}
            className="h-7 w-7 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground/75 leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Action card — interactive, click to minimize */}
        {hasAction && (
          <button
            onClick={onMinimize}
            className={cn(
              'w-full text-left rounded-xl p-3 mb-4 group',
              'bg-gradient-to-r from-primary/8 to-primary/4',
              'border border-primary/25 hover:border-primary/40',
              'transition-all duration-200 hover:shadow-sm hover:shadow-primary/10',
              'hover:from-primary/12 hover:to-primary/6'
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground/90 leading-snug mb-1">
                  {originalStep?.action}
                </p>
                <p className="text-[11px] text-primary/60 font-medium flex items-center gap-1 group-hover:text-primary/80 transition-colors">
                  <Minimize2 className="h-3 w-3" />
                  Clic para minimizar e intentarlo
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Step dots / progress */}
        <StepDots total={totalSteps} current={index} />

        {/* Navigation */}
        <div className="flex gap-2">
          {index > 0 && (
            <Button
              variant="outline"
              {...backProps}
              className="h-9 px-3 text-xs rounded-xl border-border/60 hover:bg-muted/60 shrink-0"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Atrás
            </Button>
          )}

          <Button
            variant="ghost"
            {...skipProps}
            className="h-9 px-3 text-xs rounded-xl text-muted-foreground/70 hover:text-destructive hover:bg-destructive/8 shrink-0 transition-colors"
            title="Saltar todo el tutorial"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>

          <Button
            {...primaryProps}
            className={cn(
              'flex-1 h-9 text-xs rounded-xl font-semibold transition-all',
              isLastStep
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20'
            )}
          >
            {isLastStep ? '🎉 ¡Completar!' : 'Siguiente'}
            {!isLastStep && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>

        {/* Duration hint */}
        {originalStep?.duration && (
          <p className="text-[10px] text-muted-foreground/40 mt-3 text-center font-medium">
            ⏱ ~{originalStep.duration}s para este paso
          </p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Completion Overlay — brief celebration when tutorial ends
// ─────────────────────────────────────────────────────────────
function CompletionFlash({ tutorialName }: { tutorialName: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 2400); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center pointer-events-none">
      <div className="animate-in zoom-in-50 fade-in-0 duration-300 text-center">
        <div className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-3xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl animate-out zoom-out-95 fade-out-0 delay-1800 duration-400 fill-mode-forwards">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">¡Tutorial completado!</p>
            <p className="text-sm text-muted-foreground mt-0.5">{tutorialName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main TutorialRunner
// ─────────────────────────────────────────────────────────────
export function TutorialRunner() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isRunning,
    tutorialState,
    getCurrentTutorial,
    setNavigate,
    endTutorial,
    goToStep,
    nextStep,
  } = useTutorial();

  const [steps, setSteps] = useState<Step[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completedTutorialName, setCompletedTutorialName] = useState('');
  const currentTutorial = getCurrentTutorial();

  useEffect(() => { setNavigate(navigate); }, [navigate, setNavigate]);

  // Abort on public routes
  useEffect(() => {
    if (isRunning) {
      const publicRoutes = ['/', '/auth', '/signup', '/reset-password', '/setup-wizard'];
      if (
        publicRoutes.includes(location.pathname) ||
        location.pathname.startsWith('/set-password/') ||
        location.pathname.includes('/signup/')
      ) {
        endTutorial();
      }
    }
  }, [location.pathname, isRunning, endTutorial]);

  // Reset minimize on step change
  useEffect(() => { setMinimized(false); }, [tutorialState.currentStepIndex]);

  // Build joyride steps
  useEffect(() => {
    if (currentTutorial) {
      const joyrideSteps: Step[] = currentTutorial.steps.map(step => {
        const hasTarget = !!step.target;
        return {
          target: hasTarget ? step.target! : 'body',
          title: step.title,
          content: step.description,
          placement: hasTarget
            ? (step.position as any || 'auto')
            : 'center',
          disableBeacon: true,
          disableOverlayClose: true,
          spotlightClicks: minimized,
          spotlightPadding: 10,
          floaterProps: { disableAnimation: true },
        };
      });
      setSteps(joyrideSteps);
    } else {
      setSteps([]);
    }
  }, [currentTutorial, minimized]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      if (status === STATUS.FINISHED && currentTutorial) {
        setCompletedTutorialName(currentTutorial.moduleName);
        setShowCompletion(true);
        setTimeout(() => setShowCompletion(false), 2600);
      }
      endTutorial();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) goToStep(index + 1);
      else if (action === ACTIONS.PREV) goToStep(index - 1);
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial: Target not found en paso ${index}`);
    }

    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) endTutorial();
  };

  const handleMiniBarNext = useCallback(() => {
    setMinimized(false);
    setTimeout(() => nextStep(), 160);
  }, [nextStep]);

  if (!isRunning || !currentTutorial) {
    return showCompletion ? <CompletionFlash tutorialName={completedTutorialName} /> : null;
  }

  const currentStep = currentTutorial.steps[tutorialState.currentStepIndex];
  const isLastStep = tutorialState.currentStepIndex === currentTutorial.steps.length - 1;

  return (
    <>
      <Joyride
        steps={steps}
        stepIndex={tutorialState.currentStepIndex}
        run={isRunning && !minimized}
        callback={handleJoyrideCallback}
        continuous
        scrollToFirstStep
        scrollOffset={100}
        showProgress={false}
        showSkipButton
        disableScrollParentFix
        tooltipComponent={(props: TooltipRenderProps) => (
          <CustomTooltip
            {...props}
            minimized={minimized}
            onMinimize={() => setMinimized(true)}
          />
        )}
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: minimized ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.65)',
          },
          spotlight: {
            borderRadius: '14px',
            boxShadow: '0 0 0 3px hsl(var(--primary) / 0.35), 0 0 0 5000px rgba(0,0,0,0.65)',
          },
        }}
      />

      {/* Minimized mini-bar */}
      {minimized && currentStep && (
        <MiniBar
          stepTitle={currentStep.title}
          stepAction={currentStep.action}
          stepIndex={tutorialState.currentStepIndex}
          totalSteps={currentTutorial.steps.length}
          tutorialName={currentTutorial.moduleName}
          onExpand={() => setMinimized(false)}
          onNext={handleMiniBarNext}
          isLastStep={isLastStep}
        />
      )}

      {/* Completion flash */}
      {showCompletion && <CompletionFlash tutorialName={completedTutorialName} />}
    </>
  );
}
