// ============================================================
// Onboarding Infrastructure Service
// Handles all DB communication via Supabase RPCs.
// Completely decoupled from UI — pure async CRUD.
//
// Note: RPC types will be auto-generated after running the
// migration. Until then, we use type assertions on rpc() calls.
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import type { OnboardingState, OnboardingStep } from './types';

/** Parse the raw RPC response into our domain type */
function parseOnboardingState(raw: Record<string, unknown>): OnboardingState {
  return {
    currentStep: (raw.current_step as OnboardingStep) ?? 'WELCOME',
    completedSteps: (raw.completed_steps as OnboardingStep[]) ?? [],
    completedAt: (raw.completed_at as string) ?? null,
    startedAt: (raw.started_at as string) ?? undefined,
  };
}

/** Fetch (or initialize) onboarding state for the current user + company */
export async function fetchOnboardingState(companyId: string): Promise<OnboardingState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase.rpc as any)('get_onboarding_state', {
    p_company_id: companyId,
  });

  if (error) throw new Error(`[Onboarding] fetch failed: ${error.message}`);
  if (!data) throw new Error('[Onboarding] fetch returned null data');
  return parseOnboardingState(data as Record<string, unknown>);
}

/** Advance onboarding by completing the current step (validated in DB) */
export async function advanceOnboardingStep(
  companyId: string,
  completedStep: OnboardingStep,
): Promise<OnboardingState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase.rpc as any)('advance_onboarding_step', {
    p_company_id: companyId,
    p_completed_step: completedStep,
  });

  if (error) throw new Error(`[Onboarding] advance failed: ${error.message}`);
  if (!data) throw new Error('[Onboarding] advance returned null data');
  return parseOnboardingState(data as Record<string, unknown>);
}

/** Mark a module tutorial as viewed */
export async function markModuleTutorialViewed(
  companyId: string,
  moduleName: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { error } = await (supabase.rpc as any)('mark_module_tutorial_viewed', {
    p_company_id: companyId,
    p_module_name: moduleName,
  });

  if (error) throw new Error(`[Onboarding] mark tutorial failed: ${error.message}`);
}

/** Get all module tutorial names the user has already viewed */
export async function fetchViewedModuleTutorials(companyId: string): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types yet
  const { data, error } = await (supabase.rpc as any)('get_viewed_module_tutorials', {
    p_company_id: companyId,
  });

  if (error) throw new Error(`[Onboarding] fetch tutorials failed: ${error.message}`);
  if (!data) return [];
  return (data as string[]) ?? [];
}
