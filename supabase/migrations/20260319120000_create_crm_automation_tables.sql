BEGIN;

-- =====================================================
-- 0) Helpers de permisos para automatizaciones CRM
-- Reutiliza funciones CRM existentes (roles/permisos).
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_can_view_automations()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((public.crm_user_permissions() ->> 'can_view')::boolean, false)
$$;

CREATE OR REPLACE FUNCTION public.crm_can_manage_automations()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((public.crm_user_permissions() ->> 'can_edit')::boolean, false)
$$;

-- =====================================================
-- 1) Workflows
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_automation_workflows_company_idx
  ON public.crm_automation_workflows (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_workflows_status_idx
  ON public.crm_automation_workflows (company_id, status);

-- =====================================================
-- 2) Workflow versions (snapshot inmutable)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.crm_automation_workflows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  definition jsonb NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_automation_versions_current_unique_idx
  ON public.crm_automation_workflow_versions (workflow_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS crm_automation_versions_company_idx
  ON public.crm_automation_workflow_versions (company_id, workflow_id, created_at DESC);

-- =====================================================
-- 3) Ejecuciones
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.crm_automation_workflows(id) ON DELETE CASCADE,
  workflow_version_id uuid REFERENCES public.crm_automation_workflow_versions(id) ON DELETE SET NULL,
  source_event_id text NOT NULL,
  source_event_type text NOT NULL,
  source_entity_type text NOT NULL CHECK (source_entity_type IN ('opportunity', 'pipeline')),
  source_entity_id uuid,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'canceled', 'dead_letter')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_event_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS crm_automation_exec_company_status_idx
  ON public.crm_automation_executions (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_exec_workflow_idx
  ON public.crm_automation_executions (workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_exec_entity_idx
  ON public.crm_automation_executions (company_id, source_entity_type, source_entity_id);

-- =====================================================
-- 4) Pasos de ejecución
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.crm_automation_executions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_key text NOT NULL,
  step_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  error_message text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, step_order)
);

CREATE INDEX IF NOT EXISTS crm_automation_steps_exec_idx
  ON public.crm_automation_execution_steps (execution_id, step_order);

CREATE INDEX IF NOT EXISTS crm_automation_steps_company_status_idx
  ON public.crm_automation_execution_steps (company_id, status, created_at DESC);

-- =====================================================
-- 5) Dead-letter queue
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES public.crm_automation_executions(id) ON DELETE SET NULL,
  workflow_id uuid REFERENCES public.crm_automation_workflows(id) ON DELETE SET NULL,
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  replayed boolean NOT NULL DEFAULT false,
  replayed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_automation_dlq_company_created_idx
  ON public.crm_automation_dead_letter_queue (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_dlq_replayed_idx
  ON public.crm_automation_dead_letter_queue (company_id, replayed, created_at DESC);

-- =====================================================
-- 6) Trigger updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_automation_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_automation_workflows_updated_at ON public.crm_automation_workflows;
CREATE TRIGGER trg_crm_automation_workflows_updated_at
BEFORE UPDATE ON public.crm_automation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.crm_automation_set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_automation_exec_updated_at ON public.crm_automation_executions;
CREATE TRIGGER trg_crm_automation_exec_updated_at
BEFORE UPDATE ON public.crm_automation_executions
FOR EACH ROW
EXECUTE FUNCTION public.crm_automation_set_updated_at();

-- =====================================================
-- 7) RLS
-- =====================================================
ALTER TABLE public.crm_automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Workflows
DROP POLICY IF EXISTS "CRM automations workflows select" ON public.crm_automation_workflows;
DROP POLICY IF EXISTS "CRM automations workflows insert" ON public.crm_automation_workflows;
DROP POLICY IF EXISTS "CRM automations workflows update" ON public.crm_automation_workflows;
DROP POLICY IF EXISTS "CRM automations workflows delete" ON public.crm_automation_workflows;

CREATE POLICY "CRM automations workflows select"
  ON public.crm_automation_workflows
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations workflows insert"
  ON public.crm_automation_workflows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations workflows update"
  ON public.crm_automation_workflows
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations workflows delete"
  ON public.crm_automation_workflows
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- Versions
DROP POLICY IF EXISTS "CRM automations versions select" ON public.crm_automation_workflow_versions;
DROP POLICY IF EXISTS "CRM automations versions insert" ON public.crm_automation_workflow_versions;
DROP POLICY IF EXISTS "CRM automations versions update" ON public.crm_automation_workflow_versions;
DROP POLICY IF EXISTS "CRM automations versions delete" ON public.crm_automation_workflow_versions;

CREATE POLICY "CRM automations versions select"
  ON public.crm_automation_workflow_versions
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations versions insert"
  ON public.crm_automation_workflow_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations versions update"
  ON public.crm_automation_workflow_versions
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations versions delete"
  ON public.crm_automation_workflow_versions
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- Executions
DROP POLICY IF EXISTS "CRM automations executions select" ON public.crm_automation_executions;
DROP POLICY IF EXISTS "CRM automations executions insert" ON public.crm_automation_executions;
DROP POLICY IF EXISTS "CRM automations executions update" ON public.crm_automation_executions;
DROP POLICY IF EXISTS "CRM automations executions delete" ON public.crm_automation_executions;

CREATE POLICY "CRM automations executions select"
  ON public.crm_automation_executions
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations executions insert"
  ON public.crm_automation_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations executions update"
  ON public.crm_automation_executions
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations executions delete"
  ON public.crm_automation_executions
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- Steps
DROP POLICY IF EXISTS "CRM automations steps select" ON public.crm_automation_execution_steps;
DROP POLICY IF EXISTS "CRM automations steps insert" ON public.crm_automation_execution_steps;
DROP POLICY IF EXISTS "CRM automations steps update" ON public.crm_automation_execution_steps;
DROP POLICY IF EXISTS "CRM automations steps delete" ON public.crm_automation_execution_steps;

CREATE POLICY "CRM automations steps select"
  ON public.crm_automation_execution_steps
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations steps insert"
  ON public.crm_automation_execution_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations steps update"
  ON public.crm_automation_execution_steps
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations steps delete"
  ON public.crm_automation_execution_steps
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- DLQ
DROP POLICY IF EXISTS "CRM automations dlq select" ON public.crm_automation_dead_letter_queue;
DROP POLICY IF EXISTS "CRM automations dlq insert" ON public.crm_automation_dead_letter_queue;
DROP POLICY IF EXISTS "CRM automations dlq update" ON public.crm_automation_dead_letter_queue;
DROP POLICY IF EXISTS "CRM automations dlq delete" ON public.crm_automation_dead_letter_queue;

CREATE POLICY "CRM automations dlq select"
  ON public.crm_automation_dead_letter_queue
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations dlq insert"
  ON public.crm_automation_dead_letter_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations dlq update"
  ON public.crm_automation_dead_letter_queue
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations dlq delete"
  ON public.crm_automation_dead_letter_queue
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

COMMIT;
