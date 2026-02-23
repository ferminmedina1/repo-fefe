// ============================================================
// OnboardingContext — Global onboarding state provider
// Manages: state machine, event bus subscriptions, feature gating.
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import {
  fetchOnboardingState,
  advanceOnboardingStep,
  onboardingEventBus,
  isOnboardingCompleted,
  getOnboardingProgress,
  ONBOARDING_STEP_CONFIGS,
  type OnboardingState,
  type OnboardingStep,
} from '@/lib/onboarding';

interface OnboardingContextType {
  /** Current state from DB */
  state: OnboardingState | null;
  /** Whether onboarding is loading */
  loading: boolean;
  /** Whether the RPC call failed (skip onboarding if true) */
  error: boolean;
  /** Whether onboarding has been completed */
  isCompleted: boolean;
  /** Progress 0..1 */
  progress: number;
  /** Current step config (title, description, icon) */
  currentStepConfig: typeof ONBOARDING_STEP_CONFIGS[number] | null;
  /** Emit an onboarding event (will advance step if it matches) */
  emitEvent: (event: string) => void;
  /** Force refresh state from DB */
  refresh: () => Promise<void>;
  /** Whether the module selector should be shown (just completed onboarding) */
  showModuleSelector: boolean;
  /** Dismiss the module selector */
  dismissModuleSelector: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const advancingRef = useRef(false);

  // Load state on mount / company change
  const loadState = useCallback(async () => {
    if (!companyId) {
      setState(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(false);
      const s = await fetchOnboardingState(companyId);
      setState(s);
      // If just completed, show module selector
      if (s.currentStep === 'COMPLETED' && s.completedAt) {
        const completedRecently = Date.now() - new Date(s.completedAt).getTime() < 60_000;
        if (completedRecently) {
          setShowModuleSelector(true);
        }
      }
    } catch (e) {
      console.error('[OnboardingProvider] Load error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Advance step handler
  const tryAdvance = useCallback(
    async (completedStep: OnboardingStep) => {
      if (!companyId || advancingRef.current) return;
      advancingRef.current = true;
      try {
        const newState = await advanceOnboardingStep(companyId, completedStep);
        setState(newState);
        if (newState.currentStep === 'COMPLETED') {
          onboardingEventBus.emit('onboarding.completed');
          setShowModuleSelector(true);
        }
      } catch (e) {
        console.error('[OnboardingProvider] Advance error:', e);
      } finally {
        advancingRef.current = false;
      }
    },
    [companyId],
  );

  // Subscribe to event bus — listen for events that match the current step
  useEffect(() => {
    if (!state || state.currentStep === 'COMPLETED') return;

    const currentConfig = ONBOARDING_STEP_CONFIGS.find(
      (c) => c.step === state.currentStep,
    );
    if (!currentConfig) return;

    const unsubscribe = onboardingEventBus.on(currentConfig.triggerEvent, () => {
      tryAdvance(state.currentStep);
    });

    return unsubscribe;
  }, [state, tryAdvance]);

  // Convenience: emit event from UI
  const emitEvent = useCallback((event: string) => {
    onboardingEventBus.emit(event);
  }, []);

  const dismissModuleSelector = useCallback(() => {
    setShowModuleSelector(false);
  }, []);

  const isCompleted = state ? isOnboardingCompleted(state) : false;
  const progress = state ? getOnboardingProgress(state) : 0;
  const currentStepConfig = state
    ? ONBOARDING_STEP_CONFIGS.find((c) => c.step === state.currentStep) ?? null
    : null;

  const value = useMemo<OnboardingContextType>(
    () => ({
      state,
      loading,
      error,
      isCompleted,
      progress,
      currentStepConfig,
      emitEvent,
      refresh: loadState,
      showModuleSelector,
      dismissModuleSelector,
    }),
    [state, loading, error, isCompleted, progress, currentStepConfig, emitEvent, loadState, showModuleSelector, dismissModuleSelector],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
