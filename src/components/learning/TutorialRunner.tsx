import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps, ACTIONS, EVENTS } from 'react-joyride';
import { useTutorial } from '@/hooks/useTutorial';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const CustomTooltip = ({
  index,
  step,
  tooltipProps,
  primaryProps,
  backProps,
  skipProps,
  closeProps,
  isLastStep,
}: TooltipRenderProps) => {
  const { getProgress, getCurrentTutorial } = useTutorial();
  const tutorial = getCurrentTutorial();
  const totalSteps = tutorial?.steps.length || 0;
  // Calculamos el progreso basado en el index actual en caso de un mínimo retraso del context
  const progress = totalSteps > 0 ? Math.round(((index + 1) / totalSteps) * 100) : 0;
  
  // Extraer configuración original extendida
  const originalStep = tutorial?.steps[index];

  return (
    <div
      {...tooltipProps}
      className={cn(
        'bg-card rounded-xl shadow-2xl p-6 w-[340px] max-w-md',
        'border border-primary/20 backdrop-blur-sm relative overflow-hidden',
        // Efecto glow sutil para que se vea muy premium
        'ring-1 ring-black/5 dark:ring-white/10'
      )}
    >
      {/* Decorative top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-primary/60 via-primary to-primary/60"></div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 mt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
            <span className="text-sm font-bold text-primary">
              {index + 1}
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground leading-tight pr-6">
            {originalStep?.title || step.title}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          {...closeProps}
          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full absolute top-4 right-4 transition-colors"
        >
          <X className="h-[14px] w-[14px]" />
        </Button>
      </div>

      {/* Contenido principal */}
      <div className="text-[14px] text-foreground/80 mb-5 leading-relaxed font-medium">
        {step.content}
      </div>

      {/* Acción sugerida (si aplica) */}
      {originalStep?.action && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3.5 py-3 mb-5 flex gap-2.5 items-start shadow-sm transition-all hover:bg-primary/10">
          <span className="text-lg leading-none mt-0.5 animate-pulse">💡</span>
          <p className="text-sm text-foreground/90 font-medium leading-snug">
            {originalStep.action}
          </p>
        </div>
      )}

      {/* Barra de progreso */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Paso {index + 1} de {totalSteps}
          </span>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-secondary/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex gap-2">
        {index > 0 && (
          <Button
            variant="outline"
            {...backProps}
            className="flex-1 text-xs h-9 shadow-sm border-border/60 hover:bg-secondary/50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Atrás
          </Button>
        )}

        <Button
          variant="ghost"
          {...skipProps}
          className="flex-[0.5] text-xs h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Saltar tutorial"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <Button
          {...primaryProps}
          className="flex-1 text-xs h-9 shadow-md hover:shadow-lg transition-all bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLastStep ? 'Terminar' : 'Siguiente'}
          {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>

      {/* Info adicional opcional */}
      {originalStep?.duration && (
        <p className="text-[10px] text-muted-foreground/60 mt-3 text-center uppercase tracking-wider font-semibold">
          ⏱️ Estimado: {originalStep.duration}s
        </p>
      )}
    </div>
  );
};

export function TutorialRunner() {
  const navigate = useNavigate();
  const {
    isRunning,
    tutorialState,
    getCurrentTutorial,
    setNavigate,
    endTutorial,
    goToStep,
  } = useTutorial();

  const [steps, setSteps] = useState<Step[]>([]);
  const currentTutorial = getCurrentTutorial();

  // Registrar el navigate en el contexto para los cambios de ruta programáticos
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  useEffect(() => {
    if (currentTutorial) {
      const joyrideSteps: Step[] = currentTutorial.steps.map(step => {
        const hasTarget = !!step.target;
        return {
          target: hasTarget ? step.target! : 'body',
          title: step.title,
          content: step.description,
          placement: hasTarget 
            ? (step.position === 'top' ? 'top' : step.position === 'bottom' ? 'bottom' : step.position === 'left' ? 'left' : step.position === 'right' ? 'right' : 'auto')
            : 'center',
          disableBeacon: true,
          disableOverlayClose: true,  // Spotlight estricto: evita cierre por clic afuera
          spotlightClicks: false,     // Bloquea clics en el elemento mientras lee el tooltip
          spotlightPadding: 8,
          // Evitamos que al cambiar entre rutas el tooltip tiemble
          floaterProps: {
            disableAnimation: true,
          }
        };
      });
      setSteps(joyrideSteps);
    } else {
      setSteps([]);
    }
  }, [currentTutorial]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    // Cuando termina voluntariamente o por skip
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      endTutorial();
      return;
    }

    // Gestionamos clicks en next/prev y errores.
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        goToStep(index + 1);
      } else if (action === ACTIONS.PREV) {
        goToStep(index - 1);
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      // Ignorar discretamente el TARGET_NOT_FOUND sin forzar un loop, 
      // ya que con nuestra lógica asincrónica de contexto el target puede estar formándose.
      console.warn(`Tutorial: Target not found para el paso ${index}, esperando montaje...`);
    }
    
    // Si se intentó hacer click en el botón `close` nativo
    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) {
      endTutorial();
    }
  };

  if (!isRunning || !currentTutorial) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={tutorialState.currentStepIndex}
      run={isRunning}
      callback={handleJoyrideCallback}
      continuous
      scrollToFirstStep
      scrollOffset={120} // Considera el header para un scroll suave armónico
      showProgress
      showSkipButton
      disableScrollParentFix // Previene glitches de scroll en contendores flex
      tooltipComponent={CustomTooltip}
      // Configuración estética de Joyride Overlay
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.70)', // Spotlight intenso y lujoso
        },
        spotlight: {
          borderRadius: '12px',
        }
      }}
    />
  );
}
