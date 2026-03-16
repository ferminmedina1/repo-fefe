// ============================================================
// Tutorial Runner - Componente que ejecuta tutoriales paso a paso
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
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
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const currentStep = getCurrentStep();
  const currentTutorial = getCurrentTutorial();
  const progress = getProgress();

  // Calcular estilo del highlight basado en las coordenadas del elemento
  const getHighlightStyle = useCallback((element: HTMLElement): React.CSSProperties => {
    const rect = element.getBoundingClientRect();
    const padding = 8; // píxeles de padding alrededor del elemento

    return {
      position: 'fixed',
      top: `${rect.top - padding}px`,
      left: `${rect.left - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
      pointerEvents: 'none',
      zIndex: 9999,
    };
  }, []);

  // Posicionar el tooltip
  const updateTooltipPosition = useCallback((element: HTMLElement, position: string) => {
    const rect = element.getBoundingClientRect();
    const offset = 20;
    const tooltipWidth = 320; // max-w-md = 28rem = 448px, pero siendo conservador
    const tooltipHeight = 250; // estimado

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10001,
    };

    // Calcular espacio disponible
    const spaceTop = rect.top;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    // Decidir posición con fallback si no hay espacio
    let finalPosition = position;
    if (finalPosition === 'top' && spaceTop < tooltipHeight + offset) {
      finalPosition = 'bottom';
    }
    if (finalPosition === 'bottom' && spaceBottom < tooltipHeight + offset) {
      finalPosition = 'top';
    }
    if (finalPosition === 'left' && spaceLeft < tooltipWidth + offset) {
      finalPosition = 'right';
    }
    if (finalPosition === 'right' && spaceRight < tooltipWidth + offset) {
      finalPosition = 'left';
    }

    switch (finalPosition) {
      case 'top':
        style.top = `${rect.top - tooltipHeight - offset}px`;
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
        style.left = `${rect.left - tooltipWidth - offset}px`;
        style.transform = 'translateY(-50%)';
        break;
      case 'right':
        style.top = `${rect.top + rect.height / 2}px`;
        style.left = `${rect.right + offset}px`;
        style.transform = 'translateY(-50%)';
        break;
    }

    setTooltipStyle(style);
  }, []);

  // Actualizar positions cuando cambia el paso o la ventana se redimensiona
  useEffect(() => {
    if (!isRunning || !currentStep) return;

    const updatePositions = () => {
      if (currentStep.target) {
        const element = document.querySelector(currentStep.target) as HTMLElement;
        if (element) {
          setHighlightElement(element);
          setHighlightStyle(getHighlightStyle(element));
          updateTooltipPosition(element, currentStep.position || 'bottom');

          // Scroll al elemento
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Sin target, mostrar en el centro
        setHighlightElement(null);
        setHighlightStyle({});
        setTooltipStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10001,
        });
      }
    };

    updatePositions();

    // Re-calcular posiciones al redimensionar
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions);
    };
  }, [isRunning, currentStep, getHighlightStyle, updateTooltipPosition]);

  if (!isRunning || !currentStep || !currentTutorial) return null;

  const totalSteps = currentTutorial.steps.length;
  const currentIndex = tutorialState.currentStepIndex;
  const isLastStep = currentIndex === totalSteps - 1;

  return (
    <>
      {/* Overlay oscuro con spotlight en el elemento */}
      {highlightElement && (
        <>
          <div className="tutorial-overlay" />
          <div 
            className="tutorial-highlight"
            style={highlightStyle}
          />
        </>
      )}

      {/* Tooltip con instrucciones */}
      <div
        className={cn(
          'tutorial-tooltip',
          'bg-white dark:bg-slate-900 rounded-lg shadow-2xl p-6',
          'max-w-md'
        )}
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
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
            className="h-8 w-8 p-0 shrink-0"
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
