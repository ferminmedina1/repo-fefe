import React, { useEffect, useState, useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps, ACTIONS, EVENTS } from 'react-joyride';
import { useTutorial } from '@/hooks/useTutorial';
import { Button } from '@/components/ui/button';
import {
  ChevronRight, ChevronLeft, X, SkipForward,
  Minimize2, Maximize2, CheckCircle2, Zap, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// Spotlight pulse animation
// ─────────────────────────────────────────────────────────────
const spotlightStyles = `
  @keyframes spotlight-pulse {
    0%, 100% {
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.7), 0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 25px rgba(59, 130, 246, 0.25) !important;
    }
    50% {
      box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.8), 0 0 0 12px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.8), 0 0 80px rgba(59, 130, 246, 0.6), inset 0 0 35px rgba(59, 130, 246, 0.35) !important;
    }
  }
  
  .react-joyride__spotlight {
    animation: spotlight-pulse 2s ease-in-out infinite !important;
  }
`;

// ─────────────────────────────────────────────────────────────
// Step dots / progress indicator
// ─────────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  if (total > 10) {
    const progress = Math.round(((current + 1) / total) * 100);
    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground">Paso {current + 1} de {total}</span>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground">Paso {current + 1} de {total}</span>
        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">{Math.round(((current + 1) / total) * 100)}%</span>
      </div>
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={cn('rounded-full transition-all duration-300', i === current ? 'w-5 h-2 bg-primary shadow-sm shadow-primary/50' : i < current ? 'w-2 h-2 bg-primary/40' : 'w-2 h-2 bg-muted')} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Advanced target validation with detailed diagnostics
// ─────────────────────────────────────────────────────────────
interface ValidationResult {
  isValid: boolean;
  reason?: string;
  details?: {
    exists: boolean;
    visible: boolean;
    hasDimensions: boolean;
    hasContent: boolean;
    inViewport: boolean;
    notHidden: boolean;
    zIndexOk: boolean;
  };
}

function validateTarget(selector: string | undefined, debug = false): ValidationResult {
  if (!selector) {
    return { isValid: false, reason: 'No selector provided' };
  }
  
  try {
    const element = document.querySelector(selector);
    if (!element) {
      return { isValid: false, reason: 'Element not found in DOM', details: { exists: false, visible: false, hasDimensions: false, hasContent: false, inViewport: false, notHidden: false, zIndexOk: false } };
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement;
    const parentStyle = parent ? window.getComputedStyle(parent) : null;

    // Detailed checks
    // NOTE: hasContent is NOT a blocker - elements can be loading (skeleton/placeholder)
    // What matters: exists, visible, has minimal dimensions, in viewport
    const hasMinimalContent = !!(element.textContent?.trim() || element.children.length > 0);
    const isLoadingState = element.classList.contains('animate-pulse') || 
                          element.classList.contains('skeleton') ||
                          element.classList.contains('loading') ||
                          element.getAttribute('aria-busy') === 'true';

    const checks = {
      exists: true,
      visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
      hasDimensions: rect.width > 0 && rect.height > 0,
      hasContent: hasMinimalContent || isLoadingState, // Accept if it has content OR is in loading state
      inViewport: rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0,
      notHidden: style.overflow !== 'hidden' || rect.height > 0,
      zIndexOk: parseInt(style.zIndex) >= 0 || style.zIndex === 'auto',
    };

    // Only require: exists, visible, hasDimensions, inViewport
    // Don't block on hasContent (element can be loading)
    const allValid = checks.exists && checks.visible && checks.hasDimensions && checks.inViewport;

    if (debug) {
      console.log(`[Tutorial] Target validation for "${selector}":`, {
        ...checks,
        isLoadingState,
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        parentOverflow: parentStyle?.overflow,
      });
    }

    if (!allValid) {
      const failureReasons = [];
      if (!checks.exists) failureReasons.push('Element not in DOM');
      if (!checks.visible) failureReasons.push('Element hidden (display/visibility/opacity)');
      if (!checks.hasDimensions) failureReasons.push(`No dimensions (${rect.width}x${rect.height})`);
      if (!checks.inViewport) failureReasons.push(`Out of viewport (top=${rect.top.toFixed(0)}, bottom=${rect.bottom.toFixed(0)})`);
      
      return {
        isValid: false,
        reason: failureReasons.join('; '),
        details: checks,
      };
    }

    return {
      isValid: true,
      details: checks,
    };
  } catch (e) {
    return { isValid: false, reason: `Error during validation: ${(e as Error).message}` };
  }
}

function isValidTarget(selector: string | undefined): boolean {
  return validateTarget(selector).isValid;
}

// ─────────────────────────────────────────────────────────────
// Narration Card — for steps WITHOUT a target element.
// Shown as a bottom slide-up panel. No dark overlay.
// ─────────────────────────────────────────────────────────────
interface NarrationCardProps {
  stepIndex: number;
  totalSteps: number;
  tutorialName: string;
  title: string;
  description: string;
  blockName?: string;
  action?: string;
  isLastStep: boolean;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onMinimize: () => void;
  targetUnavailable?: boolean;
  targetFailureReason?: string;
}

function NarrationCard({
  stepIndex, totalSteps, tutorialName, title, description,
  blockName, action, isLastStep, canGoBack, onNext, onBack, onSkip, onMinimize, targetUnavailable, targetFailureReason
}: NarrationCardProps) {
  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001]',
      'w-[400px] max-w-[calc(100vw-24px)]',
      'bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden',
      'border border-border/70 shadow-[0_16px_48px_rgba(0,0,0,0.22)]',
      'animate-in slide-in-from-bottom-4 fade-in-0 duration-300 ease-out'
    )}>
      {/* Accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

      {/* Block name or "General Overview" badge — IMPROVED VISIBILITY */}
      <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary/15 to-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 shadow-sm shadow-primary/20">
          {blockName ? (
            <>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-sm shadow-primary/50" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider whitespace-nowrap">{blockName}</span>
            </>
          ) : (
            <>
              <FileText className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                {targetUnavailable ? '⚠️ Elemento no disponible' : 'Vista general'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="p-5 pt-7">
        {/* Header */}
        <div className="flex gap-3 mb-3 pr-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary tabular-nums">{stepIndex + 1}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{tutorialName}</p>
            <h3 className="text-sm font-bold text-foreground leading-snug">{title}</h3>
          </div>
        </div>

        {/* Warning if target unavailable */}
        {targetUnavailable && (
          <div className="mb-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-xs text-yellow-700 dark:text-yellow-200 font-medium">
              ⏳ El elemento de enfoque no está disponible aún.
            </p>
            {targetFailureReason && (
              <p className="text-xs text-yellow-700/70 dark:text-yellow-200/70 mt-1">
                Motivo: {targetFailureReason}
              </p>
            )}
            <p className="text-xs text-yellow-700/60 dark:text-yellow-200/60 mt-1">
              Continúa con la siguiente instrucción.
            </p>
          </div>
        )}

        {/* Controls top-right */}
        <div className="absolute top-[calc(3px+10px)] right-3 flex gap-1">
          {action && (
            <Button variant="ghost" size="icon" onClick={onMinimize}
              className="h-7 w-7 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10">
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onSkip}
            className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/70">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground/70 leading-relaxed mb-3">{description}</p>

        {/* Action card */}
        {action && (
          <button onClick={onMinimize}
            className="w-full text-left rounded-xl p-3 mb-3 group bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/20 hover:border-primary/35 hover:from-primary/12 hover:to-primary/6 transition-all">
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="h-3 w-3 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground/90 leading-snug">{action}</p>
                <p className="text-[10px] text-primary/60 mt-0.5 flex items-center gap-1 group-hover:text-primary/80">
                  <Minimize2 className="h-2.5 w-2.5" /> Minimizar para hacerlo
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Progress */}
        <StepDots total={totalSteps} current={stepIndex} />

        {/* Navigation */}
        <div className="flex gap-2">
          {canGoBack && (
            <Button variant="outline" size="sm" onClick={onBack}
              className="h-8 px-3 text-xs rounded-xl border-border/60 hover:bg-muted/60">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Atrás
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onSkip}
            className="h-8 px-3 text-xs rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/8">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={onNext}
            className={cn('flex-1 h-8 text-xs rounded-xl font-semibold transition-all',
              isLastStep
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}>
            {isLastStep ? '🎉 ¡Completar!' : 'Siguiente'}
            {!isLastStep && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mini-bar — shown when any step is minimized
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
const MiniBar = ({ stepTitle, stepAction, stepIndex, totalSteps, tutorialName, onExpand, onNext, isLastStep }: MiniBarProps) => {
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[10002]',
      'flex items-center gap-3 pl-3 pr-2 py-2 rounded-2xl',
      'bg-background/95 border border-border/80 backdrop-blur-xl',
      'shadow-[0_8px_32px_rgba(0,0,0,0.18)]',
      'animate-in slide-in-from-bottom-3 duration-300 ease-out'
    )} style={{ maxWidth: 'calc(100vw - 24px)' }}>
      {/* SVG circular progress */}
      <div className="relative shrink-0 w-9 h-9">
        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/40" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeDasharray={`${progress * 0.879} 87.9`} strokeLinecap="round"
            className="text-primary transition-all duration-500" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">{stepIndex + 1}</span>
      </div>

      <div className="flex flex-col min-w-0 max-w-[200px]">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate leading-none mb-0.5">
          {stepAction ? '⚡ Tu turno' : tutorialName}
        </span>
        <span className="text-sm font-semibold text-foreground truncate leading-tight">{stepAction || stepTitle}</span>
      </div>

      <div className="w-px h-7 bg-border/60 shrink-0" />

      <Button variant="ghost" size="icon" onClick={onExpand}
        className="h-8 w-8 shrink-0 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground">
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      <Button onClick={onNext} size="sm"
        className={cn('h-8 px-3 rounded-xl text-xs font-bold shrink-0 gap-1.5',
          isLastStep
            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25'
        )}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {isLastStep ? 'Finalizar' : 'Listo ✓'}
      </Button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Arrow pointer for visual guidance
// ─────────────────────────────────────────────────────────────
function TooltipArrow() {
  return (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
      <div className="w-0 h-0 border-l-8 border-r-8 border-t-0 border-b-8 border-l-transparent border-r-transparent border-b-card" />
      <div className="absolute top-px left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-0 border-b-6 border-l-transparent border-r-transparent border-b-border/70" />
    </div>
  );
}
interface ExtendedTooltipProps extends TooltipRenderProps {
  onMinimize: () => void;
}
const CustomTooltip = ({
  index, step, tooltipProps, primaryProps, backProps, skipProps, closeProps, isLastStep, onMinimize
}: ExtendedTooltipProps) => {
  const { getCurrentTutorial } = useTutorial();
  const tutorial = getCurrentTutorial();
  const totalSteps = tutorial?.steps.length || 0;
  const originalStep = tutorial?.steps[index];
  const hasAction = !!originalStep?.action;

  return (
    <div {...tooltipProps} className={cn(
      'relative w-[400px] max-w-[calc(100vw-24px)]',
      'bg-card/98 backdrop-blur-xl rounded-2xl overflow-hidden',
      'border border-border/70 shadow-[0_16px_48px_rgba(0,0,0,0.22)]',
      'animate-in slide-in-from-bottom-4 fade-in-0 duration-300 ease-out'
    )}>
      <div className="h-[3px] w-full bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

      <div className="p-5 pt-7">
        {/* Header */}
        <div className="flex gap-3 mb-3 pr-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary tabular-nums">{index + 1}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{tutorial?.moduleName}</p>
            <h3 className="text-sm font-bold text-foreground leading-snug">{originalStep?.title || step.title}</h3>
          </div>
        </div>

        {/* Block indicator badge */}
        {originalStep?.blockName && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/15 to-primary/10 border border-primary/30 shadow-sm shadow-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-sm shadow-primary/50" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-wide whitespace-nowrap">{originalStep.blockName}</span>
          </div>
        )}

        {/* Controls top-right */}
        <div className="absolute top-[calc(3px+10px)] right-3 flex gap-1">
          {hasAction && (
            <Button variant="ghost" size="icon" onClick={onMinimize}
              className="h-7 w-7 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10">
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" {...closeProps}
            className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/70">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground/70 leading-relaxed mb-3">{step.content}</p>

        {/* Action card */}
        {hasAction && (
          <button onClick={onMinimize} className="w-full text-left rounded-xl p-3 mb-3 group bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/20 hover:border-primary/35 hover:from-primary/12 hover:to-primary/6 transition-all">
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="h-3 w-3 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground/90 leading-snug">{originalStep?.action}</p>
                <p className="text-[10px] text-primary/60 mt-0.5 flex items-center gap-1 group-hover:text-primary/80">
                  <Minimize2 className="h-2.5 w-2.5" /> Minimizar para hacerlo
                </p>
              </div>
            </div>
          </button>
        )}

        <StepDots total={totalSteps} current={index} />

        {/* Nav */}
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="outline" {...backProps} className="h-8 px-3 text-xs rounded-xl border-border/60 hover:bg-muted/60 shrink-0">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Atrás
            </Button>
          )}
          <Button variant="ghost" {...skipProps}
            className="h-8 px-3 text-xs rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/8 shrink-0">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
          <Button {...primaryProps} className={cn('flex-1 h-8 text-xs rounded-xl font-semibold',
            isLastStep
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20'
          )}>
            {isLastStep ? '🎉 ¡Completar!' : 'Siguiente'}
            {!isLastStep && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>

        {originalStep?.duration && (
          <p className="text-[10px] text-muted-foreground/40 mt-3 text-center">⏱ ~{originalStep.duration}s</p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Completion flash
// ─────────────────────────────────────────────────────────────
function CompletionFlash({ tutorialName }: { tutorialName: string }) {
  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center pointer-events-none">
      <div className="animate-in zoom-in-75 fade-in-0 duration-250 text-center">
        <div className={cn(
          'inline-flex flex-col items-center gap-3 px-8 py-6 rounded-3xl',
          'bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl',
          'animate-out zoom-out-95 fade-out-0 duration-350 fill-mode-forwards',
          '[animation-delay:2000ms]'
        )}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">¡Tutorial completado! 🎉</p>
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
    isRunning, tutorialState, getCurrentTutorial,
    setNavigate, endTutorial, goToStep, nextStep, skipTutorial,
  } = useTutorial();

  const [joyrideSteps, setJoyrideSteps] = useState<Step[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [completedName, setCompletedName] = useState('');
  const [showCompletion, setShowCompletion] = useState(false);
  const [invalidTargets, setInvalidTargets] = useState<Set<string>>(new Set());
  const [targetFailureReasons, setTargetFailureReasons] = useState<Map<string, string>>(new Map());

  // Refs to avoid stale closures in completion callbacks
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTutorial = getCurrentTutorial();

  useEffect(() => { setNavigate(navigate); }, [navigate, setNavigate]);

  // Inject spotlight pulse animation styles
  useEffect(() => {
    const styleId = 'spotlight-pulse-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = spotlightStyles;
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // Abort on public routes
  useEffect(() => {
    if (!isRunning) return;
    const pub = ['/', '/auth', '/signup', '/reset-password', '/setup-wizard'];
    const path = location.pathname;
    if (pub.includes(path) || path.startsWith('/set-password/') || path.includes('/signup/')) {
      endTutorial();
    }
  }, [location.pathname, isRunning, endTutorial]);

  // Reset minimized on step change
  useEffect(() => { setMinimized(false); }, [tutorialState.currentStepIndex]);

  // Continuously validate current target (robust: 8 sec retry with exponential backoff)
  useEffect(() => {
    if (!isRunning || minimized) {
      if (validationTimerRef.current) clearInterval(validationTimerRef.current);
      return;
    }
    
    const currentStep = currentTutorial?.steps[tutorialState.currentStepIndex];
    if (!currentStep?.target) return;

    const selector = currentStep.target;
    let attempts = 0;
    const maxAttempts = 24; // 12 seconds with varying intervals (more time for async loads)
    let observer: IntersectionObserver | null = null;

    const checkAndUpdateTarget = () => {
      const validation = validateTarget(selector, attempts === 0);
      
      if (validation.isValid) {
        // Target is valid, ensure it's not in invalid set
        setInvalidTargets(prev => {
          const updated = new Set(prev);
          updated.delete(selector);
          return updated;
        });
        
        // Clear failure reason
        setTargetFailureReasons(prev => {
          const updated = new Map(prev);
          updated.delete(selector);
          return updated;
        });
        
        // Stop checking
        if (validationTimerRef.current) {
          clearInterval(validationTimerRef.current);
          validationTimerRef.current = null;
        }
        if (observer) observer.disconnect();
        
        if (attempts > 0) {
          console.log(`[Tutorial] Target "${selector}" recovered after ${attempts} attempts`);
        }
        return true;
      }
      
      return false;
    };

    // Check immediately
    if (checkAndUpdateTarget()) return;

    // Mark as temporarily invalid
    setInvalidTargets(prev => new Set([...prev, selector]));

    // Set up IntersectionObserver to catch async-loaded elements
    try {
      const element = document.querySelector(selector);
      if (element) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                // Element became visible
                checkAndUpdateTarget();
              }
            });
          },
          { threshold: 0.1 }
        );
        observer.observe(element);
      }
    } catch (e) {
      console.warn(`[Tutorial] Could not set up IntersectionObserver for "${selector}"`);
    }

    // Retry with exponential backoff: fast at first, slower over time
    validationTimerRef.current = setInterval(() => {
      attempts++;
      
      // Progressive backoff: faster retries early, slower later (better for async loading)
      let nextInterval = 250;
      if (attempts > 16) nextInterval = 1500; // Very slow (long waits)
      else if (attempts > 8) nextInterval = 1000; // Slow (1 sec each)
      else if (attempts > 4) nextInterval = 500; // Medium (half sec each)
      // else: 250ms for first 4 attempts

      if (checkAndUpdateTarget()) {
        // Found! Stop searching
        return;
      }

      if (attempts >= maxAttempts) {
        // 8+ seconds passed, mark as permanently unavailable
        const validation = validateTarget(selector);
        console.warn(
          `[Tutorial] Target \"${selector}\" not found after ${maxAttempts} attempts`,
          validation
        );
        
        setInvalidTargets(prev => new Set([...prev, selector]));
        
        // Save failure reason
        setTargetFailureReasons(prev => {
          const updated = new Map(prev);
          updated.set(selector, validation.reason || 'Elemento no encontrado');
          return updated;
        });
        
        if (validationTimerRef.current) {
          clearInterval(validationTimerRef.current);
          validationTimerRef.current = null;
        }
        if (observer) observer.disconnect();
      }
    }, 200); // Start fast, intervals increase inside the loop

    return () => {
      if (validationTimerRef.current) clearInterval(validationTimerRef.current);
      if (observer) observer.disconnect();
    };
  }, [isRunning, tutorialState.currentStepIndex, minimized, currentTutorial]);

  // Derive current step — check if target is valid
  const stepIndex = tutorialState.currentStepIndex;
  const currentOriginalStep = currentTutorial?.steps[stepIndex] ?? null;
  
  // If target exists but is invalid in DOM, treat as untargeted (fallback to narration)
  const targetIsInvalid = currentOriginalStep?.target && invalidTargets.has(currentOriginalStep.target);
  const isUntargetedStep = isRunning && currentOriginalStep && (!currentOriginalStep.target || targetIsInvalid);
  const isLastStep = !!currentTutorial && stepIndex === currentTutorial.steps.length - 1;

  // Build Joyride steps (only targeted ones will be spotlighted)
  useEffect(() => {
    if (!currentTutorial) { setJoyrideSteps([]); return; }
    const steps: Step[] = currentTutorial.steps.map(step => ({
      target: (step.target && !invalidTargets.has(step.target)) ? step.target : 'body',
      title: step.title,
      content: step.description,
      placement: (step.target && !invalidTargets.has(step.target))
        ? (step.position === 'top' ? 'top' : step.position === 'bottom' ? 'bottom' : step.position === 'left' ? 'left' : step.position === 'right' ? 'right' : 'auto')
        : 'center',
      disableBeacon: true,
      disableOverlayClose: true,
      spotlightClicks: minimized,
      spotlightPadding: 13,
      floaterProps: { 
        disableAnimation: true,
        autoUpdate: true, // Recalculate position on scroll/resize
      },
    }));
    setJoyrideSteps(steps);
  }, [currentTutorial, invalidTargets, minimized]);

  // Trigger completion flash
  const triggerCompletion = useCallback((name: string) => {
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    setCompletedName(name);
    setShowCompletion(true);
    completionTimerRef.current = setTimeout(() => setShowCompletion(false), 2600);
  }, []);

  useEffect(() => () => { if (completionTimerRef.current) clearTimeout(completionTimerRef.current); }, []);

  // Joyride callback — only relevant for targeted steps
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      if (status === STATUS.FINISHED && currentTutorial) triggerCompletion(currentTutorial.moduleName);
      endTutorial();
      return;
    }
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) goToStep(index + 1);
      else if (action === ACTIONS.PREV) goToStep(index - 1);
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn(`Tutorial: target no encontrado en paso ${index}`);
    }
    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) endTutorial();
  }, [currentTutorial, endTutorial, goToStep, triggerCompletion]);

  // NarrationCard handlers
  const handleNarrationNext = useCallback(() => {
    if (isLastStep && currentTutorial) {
      triggerCompletion(currentTutorial.moduleName);
      nextStep();
    } else {
      nextStep();
    }
  }, [isLastStep, currentTutorial, nextStep, triggerCompletion]);

  const handleNarrationBack = useCallback(() => {
    goToStep(stepIndex - 1);
  }, [goToStep, stepIndex]);

  // MiniBar advance
  const handleMiniBarNext = useCallback(() => {
    setMinimized(false);
    setTimeout(() => nextStep(), 160);
  }, [nextStep]);

  // Joyride should be running only when:
  // - isRunning AND not minimized AND current step HAS a VALID target
  const shouldRunJoyride = isRunning && !minimized && !isUntargetedStep;

  if (!isRunning && !showCompletion) return null;

  return (
    <>
      {/* Joyride — only for targeted steps */}
      {isRunning && joyrideSteps.length > 0 && (
        <Joyride
          key={currentTutorial?.moduleId}
          steps={joyrideSteps}
          stepIndex={stepIndex}
          run={shouldRunJoyride}
          callback={handleJoyrideCallback}
          continuous
          scrollToFirstStep
          scrollOffset={150}
          showProgress={false}
          showSkipButton
          disableScrollParentFix
          floaterProps={{ disableAnimation: true }}
          tooltipComponent={(props: TooltipRenderProps) => (
            <CustomTooltip {...props} onMinimize={() => setMinimized(true)} />
          )}
          styles={{
            options: {
              zIndex: 10000,
              overlayColor: 'rgba(0, 0, 0, 0.35)',
              arrowColor: 'transparent',
              backgroundColor: 'transparent',
              textColor: 'transparent',
              primaryColor: 'transparent',
            },
            spotlight: {
              borderRadius: '14px',
              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.7), 0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 25px rgba(59, 130, 246, 0.25)',
            },
            overlay: {
              mixBlendMode: 'normal',
              zIndex: 10000,
            },
            tooltip: {
              backgroundColor: 'transparent',
              borderRadius: '0px',
              padding: '0px',
              boxShadow: 'none',
            },
            tooltipContainer: {
              textAlign: 'left' as const,
            },
          }}
        />
      )}

      {/* NarrationCard — untargeted steps or invalid targets, no overlay */}
      {isRunning && isUntargetedStep && !minimized && currentOriginalStep && (
        <NarrationCard
          stepIndex={stepIndex}
          totalSteps={currentTutorial!.steps.length}
          tutorialName={currentTutorial!.moduleName}
          title={currentOriginalStep.title}
          description={currentOriginalStep.description}
          blockName={currentOriginalStep.blockName}
          action={currentOriginalStep.action}
          isLastStep={isLastStep}
          canGoBack={stepIndex > 0}
          onNext={handleNarrationNext}
          onBack={handleNarrationBack}
          onSkip={() => { skipTutorial(); }}
          onMinimize={() => setMinimized(true)}
          targetUnavailable={targetIsInvalid}
          targetFailureReason={targetIsInvalid && currentOriginalStep.target ? targetFailureReasons.get(currentOriginalStep.target) : undefined}
        />
      )}

      {/* MiniBar — when any step is minimized */}
      {isRunning && minimized && currentOriginalStep && (
        <MiniBar
          stepTitle={currentOriginalStep.title}
          stepAction={currentOriginalStep.action}
          stepIndex={stepIndex}
          totalSteps={currentTutorial!.steps.length}
          tutorialName={currentTutorial!.moduleName}
          onExpand={() => setMinimized(false)}
          onNext={handleMiniBarNext}
          isLastStep={isLastStep}
        />
      )}

      {/* Completion flash */}
      {showCompletion && <CompletionFlash tutorialName={completedName} />}
    </>
  );
}
