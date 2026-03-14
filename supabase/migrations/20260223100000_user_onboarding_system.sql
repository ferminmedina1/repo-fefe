-- ============================================================
-- ONBOARDING SYSTEM: user_onboarding + user_module_tutorials
-- ============================================================

-- 1. user_onboarding — tracks mandatory onboarding state machine per user
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'WELCOME'
    CHECK (current_step IN ('WELCOME','BUSINESS_SETUP','CREATE_FIRST_LEAD','MOVE_PIPELINE','ACTIVATE_AUTOMATION','COMPLETED')),
  completed_steps text[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- 2. user_module_tutorials — tracks which module tutorials a user has viewed
CREATE TABLE IF NOT EXISTS public.user_module_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, module_name)
);

-- Note: UNIQUE constraints on (user_id, company_id) already create implicit indexes.
-- Additional index on module_name for filtered lookups:
CREATE INDEX IF NOT EXISTS idx_user_module_tutorials_module ON public.user_module_tutorials(company_id, module_name);

-- RLS policies
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_tutorials ENABLE ROW LEVEL SECURITY;

-- user_onboarding: users can only see/update their own rows
DROP POLICY IF EXISTS "Users can view own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can view own onboarding" ON public.user_onboarding
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own onboarding" ON public.user_onboarding;
CREATE POLICY "Users can update own onboarding" ON public.user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

-- user_module_tutorials: users can only manage their own rows
DROP POLICY IF EXISTS "Users can view own tutorials" ON public.user_module_tutorials;
CREATE POLICY "Users can view own tutorials" ON public.user_module_tutorials
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tutorials" ON public.user_module_tutorials;
CREATE POLICY "Users can insert own tutorials" ON public.user_module_tutorials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RPC: advance_onboarding_step
-- Validates state machine transitions exclusively in the DB.
-- Returns the updated row.
-- ============================================================
CREATE OR REPLACE FUNCTION public.advance_onboarding_step(
  p_company_id uuid,
  p_completed_step text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.user_onboarding%ROWTYPE;
  v_valid_transitions jsonb := '{
    "WELCOME": "BUSINESS_SETUP",
    "BUSINESS_SETUP": "CREATE_FIRST_LEAD",
    "CREATE_FIRST_LEAD": "MOVE_PIPELINE",
    "MOVE_PIPELINE": "ACTIVATE_AUTOMATION",
    "ACTIVATE_AUTOMATION": "COMPLETED"
  }'::jsonb;
  v_next_step text;
BEGIN
  -- Get or create onboarding record
  INSERT INTO public.user_onboarding (user_id, company_id, current_step, completed_steps)
  VALUES (v_user_id, p_company_id, 'WELCOME', '{}')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.user_onboarding
  WHERE user_id = v_user_id AND company_id = p_company_id
  FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Onboarding record not found';
  END IF;

  -- Already completed
  IF v_row.current_step = 'COMPLETED' THEN
    RETURN jsonb_build_object(
      'current_step', v_row.current_step,
      'completed_steps', to_jsonb(v_row.completed_steps),
      'completed_at', v_row.completed_at
    );
  END IF;

  -- Validate: the completed step must match the current step
  IF p_completed_step <> v_row.current_step THEN
    RAISE EXCEPTION 'Invalid transition: expected to complete "%" but got "%"', v_row.current_step, p_completed_step;
  END IF;

  -- Get next step
  v_next_step := v_valid_transitions ->> v_row.current_step;
  IF v_next_step IS NULL THEN
    RAISE EXCEPTION 'No valid transition from step "%"', v_row.current_step;
  END IF;

  -- Update the record
  UPDATE public.user_onboarding
  SET
    current_step = v_next_step,
    completed_steps = array_append(completed_steps, p_completed_step),
    completed_at = CASE WHEN v_next_step = 'COMPLETED' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE user_id = v_user_id AND company_id = p_company_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'current_step', v_row.current_step,
    'completed_steps', to_jsonb(v_row.completed_steps),
    'completed_at', v_row.completed_at
  );
END;
$$;

-- ============================================================
-- RPC: get_onboarding_state
-- Returns the current onboarding state for the authenticated user.
-- Creates a WELCOME record if none exists.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_onboarding_state(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.user_onboarding%ROWTYPE;
BEGIN
  -- Ensure record exists
  INSERT INTO public.user_onboarding (user_id, company_id, current_step, completed_steps)
  VALUES (v_user_id, p_company_id, 'WELCOME', '{}')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.user_onboarding
  WHERE user_id = v_user_id AND company_id = p_company_id;

  RETURN jsonb_build_object(
    'current_step', v_row.current_step,
    'completed_steps', to_jsonb(v_row.completed_steps),
    'completed_at', v_row.completed_at,
    'started_at', v_row.started_at
  );
END;
$$;

-- ============================================================
-- RPC: mark_module_tutorial_viewed
-- Records that a user has viewed a specific module tutorial.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_module_tutorial_viewed(
  p_company_id uuid,
  p_module_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_module_tutorials (user_id, company_id, module_name)
  VALUES (auth.uid(), p_company_id, p_module_name)
  ON CONFLICT (user_id, company_id, module_name) DO NOTHING;
END;
$$;

-- ============================================================
-- RPC: get_viewed_module_tutorials
-- Returns all module names that the user has viewed for a company.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_viewed_module_tutorials(p_company_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT array_agg(module_name)
     FROM public.user_module_tutorials
     WHERE user_id = auth.uid() AND company_id = p_company_id),
    '{}'::text[]
  );
END;
$$;
