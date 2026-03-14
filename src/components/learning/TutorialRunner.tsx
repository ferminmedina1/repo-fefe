// ============================================================
// Tutorial Runner - Componente que ejecuta tutoriales paso a paso
// ============================================================

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X, SkipForward } from 'lucide-react';
import { useTutorial } from '@/hooks/useTutorial';
import { cn } from '@/lib/utils';
import './TutorialRunner.css';

export function TutorialRunner() {
  const {
    isRunning,
    activeModuleId,
    tutorialState,
    getCurrentStep,
    getCurrentTutorial,
    getProgress,
    nextStep,
    previousStep,
    endTutorial,
    skipTutorial,
    goToStep,
  } = useTutorial();

  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const currentStep = getCurrentStep();
  const currentTutorial = getCurrentTutorial();
  const progress = getProgress();

  // Actualizar highlight y posición del tooltip
  useEffect(() => {
    if (!isRunning || !currentStep) return;

    if (currentStep.target) {
      const element = document.querySelector(currentStep.target) as HTMLElement;
      if (element) {
        setHighlightElement(element);
        updateTooltipPosition(element, currentStep.position || 'top');

        // Scroll al elemento
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // Sin target, mostrar en el centro
      setHighlightElement(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    }
  }, [isRunning, currentStep]);

  const updateTooltipPosition = (element: HTMLElement, position: string) => {
    const rect = element.getBoundingClientRect();
    const style: React.CSSProperties = {
      position: 'fixed',
    };

    const offset = 20;

    switch (position) {
      case 'top':
        style.bottom = `${window.innerHeight - rect.top + offset}px`;
        style.left = `${rect.left + rect.width / 2}px`;
        style.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        style.top = `${rect.bottom + offset}px`;
        style.left = `${rect.left + rect.width / 2}px`;
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.top = `${rect.top + rect.height / 2}px`;
        style.right = `${window.innerWidth - rect.left + offset}px`;
        style.transform = 'translateY(-50%)';
        break;
      case 'right':
        style.top = `${rect.top + rect.height / 2}px`;
        style.left = `${rect.right + offset}px`;
        style.transform = 'translateY(-50%)';
        break;
    }

    setTooltipStyle(style);
  };

  if (!isRunning || !currentStep || !currentTutorial) return null;

  const totalSteps = currentTutorial.steps.length;
  const currentIndex = tutorialState.currentStepIndex;
  const isLastStep = currentIndex === totalSteps - 1;

  return (
    <>
      {/* Overlay - Oscurece todo excepto el elemento destacado */}
      {highlightElement && (
        <div className="tutorial-overlay" />
      )}

      {/* Elemento destacado */}
      {highlightElement && (
        <div className="tutorial-highlight" />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          'tutorial-tooltip',
          'bg-white dark:bg-slate-900 rounded-lg shadow-2xl p-6',
          'max-w-md z-[10001]'
        )}
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                {currentIndex + 1}
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {currentStep.title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={endTutorial}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenido */}
        <p className="text-sm text-muted-foreground mb-3">
          {currentStep.description}
        </p>

        {/* Acción sugerida */}
        {currentStep.action && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-3 py-2 mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold">💡 Próximo paso:</span> {currentStep.action}
            </p>
          </div>
        )}

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Progreso: {currentIndex + 1}/{totalSteps}
            </span>
            <span className="text-xs font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="flex gap-3">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={previousStep}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={skipTutorial}
            className="flex-1"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Saltar
          </Button>

          <Button
            onClick={isLastStep ? endTutorial : nextStep}
            size="sm"
            className="flex-1"
          >
            {isLastStep ? 'Completado ✓' : 'Siguiente'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {/* Info adicional */}
        {currentTutorial.estimatedTime && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            ⏱️ Tiempo estimado: {currentTutorial.estimatedTime} min
          </p>
        )}
      </div>
    </>
  );
}
