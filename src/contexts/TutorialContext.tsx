// ============================================================
// Tutorial Context - Compartir estado de tutoriales globalmente
// ============================================================

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { TutorialState, TutorialStep } from '@/lib/tutorial/types';
import { getTutorialByModuleId, TUTORIAL_MODULES } from '@/lib/tutorial/config';

interface TutorialContextType {
  tutorialState: TutorialState;
  isRunning: boolean;
  activeModuleId: string | null;
  
  // Acciones
  startTutorial: (moduleId: string) => void;
  startTutorialWithRoute: (moduleId: string, route?: string, navigate?: (path: string) => void) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  endTutorial: () => void;
  skipTutorial: () => void;
  setNavigate: (navigate: (path: string) => void) => void;
  
  // Información
  getCurrentStep: () => TutorialStep | null;
  getCurrentTutorial: () => any;
  getProgress: () => number;
  availableTutorials: typeof TUTORIAL_MODULES;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Ruta a donde volver cuando termine el tutorial
const RETURN_ROUTE = '/learning-center';

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    activeModuleId: null,
    currentStepIndex: 0,
    isRunning: false,
    completedSteps: [],
  });
  
  // Guardamos la función de navegación
  const navigateRef = useRef<((path: string) => void) | null>(null);
  
  const setNavigate = useCallback((navigate: (path: string) => void) => {
    navigateRef.current = navigate;
  }, []);

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
      originRoute: window.location.pathname,
    }));
  }, []);

  // Iniciar tutorial con navegación a la ruta del módulo
  const startTutorialWithRoute = useCallback((moduleId: string, route?: string, navigate?: (path: string) => void) => {
    const tutorial = getTutorialByModuleId(moduleId);
    if (!tutorial) return;

    // Guardar función de navegación si se proporciona
    if (navigate) {
      navigateRef.current = navigate;
    }

    // Primero navegar a la ruta si existe y hay función de navegación
    if (route && navigateRef.current) {
      navigateRef.current(route);
    }

    // Luego iniciar el tutorial
    setTimeout(() => {
      setTutorialState(prev => ({
        ...prev,
        activeModuleId: moduleId,
        currentStepIndex: 0,
        isRunning: true,
        completedSteps: [],
        originRoute: window.location.pathname,
      }));
    }, 0);
  }, []);

  // FIX #1 + #2: Evitar trigger doble en último paso + Sincronizar isRunning
  const nextStep = useCallback(() => {
    setTutorialState(prev => {
      const tutorial = getTutorialByModuleId(prev.activeModuleId!);
      if (!tutorial) return prev;

      const newIndex = prev.currentStepIndex + 1;
      const currentStep = tutorial.steps[prev.currentStepIndex];

      // Si es el último paso, solo limpia estado sin navegar (TutorialRunner maneja triggerCompletion)
      if (newIndex >= tutorial.steps.length) {
        if (navigateRef.current && prev.originRoute === RETURN_ROUTE) {
          setTimeout(() => {
            navigateRef.current!(RETURN_ROUTE);
          }, 2800);
        }
        return {
          ...prev,
          isRunning: false,
          activeModuleId: null,
          originRoute: undefined,
          completedSteps: [...prev.completedSteps, currentStep.id],
        };
      }

      const nextStepData = tutorial.steps[newIndex];
      
      // Si el próximo paso requiere navegación, navega sin apagar Joyride
      if (nextStepData.route && navigateRef.current) {
        navigateRef.current!(nextStepData.route!);
        setTimeout(() => {
          setTutorialState(currentState => ({
            ...currentState,
            currentStepIndex: newIndex,
            completedSteps: [...currentState.completedSteps, currentStep.id],
            isRunning: true,
          }));
        }, 400);
        
        // Mantén isRunning: true para que Joyride no se apague durante transición
        return {
          ...prev,
          isRunning: true, 
        };
      }

      return {
        ...prev,
        currentStepIndex: newIndex,
        completedSteps: [...prev.completedSteps, currentStep.id],
      };
    });
  }, []);

  // FIX #2: previousStep - Mantén isRunning durante transición
  const previousStep = useCallback(() => {
    setTutorialState(prev => {
      const tutorial = getTutorialByModuleId(prev.activeModuleId!);
      if (!tutorial) return prev;

      const newIndex = Math.max(0, prev.currentStepIndex - 1);
      
      const prevStepData = tutorial.steps[newIndex];
      if (prevStepData.route && navigateRef.current) {
        navigateRef.current!(prevStepData.route!);
        setTimeout(() => {
          setTutorialState(currentState => ({
            ...currentState,
            currentStepIndex: newIndex,
            isRunning: true,
          }));
        }, 400);
        
        return {
          ...prev,
          isRunning: true,
        };
      }
      
      return {
        ...prev,
        currentStepIndex: newIndex,
      };
    });
  }, []);

  // FIX #2: goToStep - Mantén isRunning durante transición
  const goToStep = useCallback((stepIndex: number) => {
    setTutorialState(prev => {
      const tutorial = getTutorialByModuleId(prev.activeModuleId!);
      if (!tutorial) return prev;

      const clampedIndex = Math.max(0, Math.min(stepIndex, tutorial.steps.length - 1));
      const stepData = tutorial.steps[clampedIndex];
      
      if (stepData.route && navigateRef.current) {
        navigateRef.current!(stepData.route!);
        setTimeout(() => {
          setTutorialState(currentState => ({
            ...currentState,
            currentStepIndex: clampedIndex,
            isRunning: true,
          }));
        }, 400);

        return {
          ...prev,
          isRunning: true,
        };
      }

      return {
        ...prev,
        currentStepIndex: clampedIndex,
      };
    });
  }, []);

  // Finalizar tutorial y quedarse o volver al origin
  const endTutorial = useCallback(() => {
    setTutorialState(prev => {
      if (navigateRef.current && prev.originRoute === RETURN_ROUTE) {
        setTimeout(() => {
          navigateRef.current!(RETURN_ROUTE);
        }, 0);
      }
      return {
        ...prev,
        isRunning: false,
        activeModuleId: null,
        originRoute: undefined,
      };
    });
  }, []);

  // FIX #6: skipTutorial - Preserva progreso antes de saltar
  const skipTutorial = useCallback(() => {
    setTutorialState(prev => {
      if (navigateRef.current && prev.originRoute === RETURN_ROUTE) {
        setTimeout(() => {
          navigateRef.current!(RETURN_ROUTE);
        }, 0);
      }
      return {
        activeModuleId: null,
        currentStepIndex: 0,
        isRunning: false,
        completedSteps: prev.completedSteps,
        originRoute: undefined,
      };
    });
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

  const value: TutorialContextType = {
    tutorialState,
    isRunning: tutorialState.isRunning,
    activeModuleId: tutorialState.activeModuleId,
    
    startTutorial,
    startTutorialWithRoute,
    nextStep,
    previousStep,
    goToStep,
    endTutorial,
    skipTutorial,
    setNavigate,
    
    getCurrentStep,
    getCurrentTutorial,
    getProgress,
    availableTutorials: TUTORIAL_MODULES,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
