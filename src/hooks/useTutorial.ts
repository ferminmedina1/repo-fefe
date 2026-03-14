// ============================================================
// Hook - Gestión de Tutorial Interactivo
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { TutorialState, TutorialStep } from '@/lib/tutorial/types';
import { getTutorialByModuleId, TUTORIAL_MODULES } from '@/lib/tutorial/config';

export function useTutorial() {
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    activeModuleId: null,
    currentStepIndex: 0,
    isRunning: false,
    completedSteps: [],
  });

  // Iniciar tutorial de un módulo
  const startTutorial = useCallback((moduleId: string) => {
    const tutorial = getTutorialByModuleId(moduleId);
    if (!tutorial) return;

    setTutorialState(prev => ({
      ...prev,
      activeModuleId: moduleId,
      currentStepIndex: 0,
      isRunning: true,
      completedSteps: [],
    }));
  }, []);

  // Ir al siguiente paso
  const nextStep = useCallback(() => {
    setTutorialState(prev => {
      const tutorial = getTutorialByModuleId(prev.activeModuleId!);
      if (!tutorial) return prev;

      const newIndex = prev.currentStepIndex + 1;
      const currentStep = tutorial.steps[prev.currentStepIndex];

      if (newIndex >= tutorial.steps.length) {
        // Tutorial completado
        return {
          ...prev,
          isRunning: false,
          completedSteps: [...prev.completedSteps, currentStep.id],
        };
      }

      return {
        ...prev,
        currentStepIndex: newIndex,
        completedSteps: [...prev.completedSteps, currentStep.id],
      };
    });
  }, []);

  // Ir al paso anterior
  const previousStep = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  // Saltar a un paso específico
  const goToStep = useCallback((stepIndex: number) => {
    setTutorialState(prev => {
      const tutorial = getTutorialByModuleId(prev.activeModuleId!);
      if (!tutorial) return prev;

      return {
        ...prev,
        currentStepIndex: Math.max(0, Math.min(stepIndex, tutorial.steps.length - 1)),
      };
    });
  }, []);

  // Finalizar tutorial
  const endTutorial = useCallback(() => {
    setTutorialState(prev => ({
      ...prev,
      isRunning: false,
      activeModuleId: null,
    }));
  }, []);

  // Saltar tutorial
  const skipTutorial = useCallback(() => {
    setTutorialState(prev => ({
      activeModuleId: null,
      currentStepIndex: 0,
      isRunning: false,
      completedSteps: [],
    }));
  }, []);

  // Obtener paso actual
  const getCurrentStep = useCallback((): TutorialStep | null => {
    if (!tutorialState.activeModuleId) return null;
    
    const tutorial = getTutorialByModuleId(tutorialState.activeModuleId);
    if (!tutorial) return null;

    return tutorial.steps[tutorialState.currentStepIndex] || null;
  }, [tutorialState.activeModuleId, tutorialState.currentStepIndex]);

  // Obtener tutorial actual
  const getCurrentTutorial = useCallback(() => {
    if (!tutorialState.activeModuleId) return null;
    return getTutorialByModuleId(tutorialState.activeModuleId);
  }, [tutorialState.activeModuleId]);

  // Progreso del tutorial actual (0-100)
  const getProgress = useCallback((): number => {
    const tutorial = getCurrentTutorial();
    if (!tutorial) return 0;

    const totalSteps = tutorial.steps.length;
    const currentIndex = tutorialState.currentStepIndex + 1;
    
    return Math.round((currentIndex / totalSteps) * 100);
  }, [tutorialState.currentStepIndex, getCurrentTutorial]);

  return {
    // Estado
    tutorialState,
    isRunning: tutorialState.isRunning,
    activeModuleId: tutorialState.activeModuleId,
    
    // Acciones
    startTutorial,
    nextStep,
    previousStep,
    goToStep,
    endTutorial,
    skipTutorial,
    
    // Información
    getCurrentStep,
    getCurrentTutorial,
    getProgress,
    availableTutorials: TUTORIAL_MODULES,
  };
}
