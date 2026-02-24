-- CRM automated report schedules

CREATE TABLE IF NOT EXISTS public.crm_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  send_time time NOT NULL DEFAULT '09:00:00',
  timezone text NOT NULL DEFAULT 'UTC',
  recipients text[] NOT NULL DEFAULT '{}',
  payload_mode text NOT NULL DEFAULT 'full' CHECK (payload_mode IN ('full', 'summary')),
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_report_schedules_company_idx
  ON public.crm_report_schedules (company_id);

CREATE INDEX IF NOT EXISTS crm_report_schedules_next_run_idx
  ON public.crm_report_schedules (enabled, next_run_at);

ALTER TABLE public.crm_report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CRM report schedules select" ON public.crm_report_schedules;
DROP POLICY IF EXISTS "CRM report schedules insert" ON public.crm_report_schedules;
DROP POLICY IF EXISTS "CRM report schedules update" ON public.crm_report_schedules;
DROP POLICY IF EXISTS "CRM report schedules delete" ON public.crm_report_schedules;

CREATE POLICY "CRM report schedules select"
  ON public.crm_report_schedules
  FOR SELECT
  TO authenticated
  USING (company_id = public.crm_user_company_id());

CREATE POLICY "CRM report schedules insert"
  ON public.crm_report_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.user_is_company_admin(public.crm_user_company_id())
  );

CREATE POLICY "CRM report schedules update"
  ON public.crm_report_schedules
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.user_is_company_admin(public.crm_user_company_id())
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.user_is_company_admin(public.crm_user_company_id())
  );

CREATE POLICY "CRM report schedules delete"
  ON public.crm_report_schedules
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.user_is_company_admin(public.crm_user_company_id())
  );

CREATE TABLE IF NOT EXISTS public.crm_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.crm_report_schedules(id) ON DELETE SET NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  response_code integer,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_report_runs_company_idx
  ON public.crm_report_runs (company_id, created_at DESC);

ALTER TABLE public.crm_report_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CRM report runs select" ON public.crm_report_runs;
DROP POLICY IF EXISTS "CRM report runs insert" ON public.crm_report_runs;

CREATE POLICY "CRM report runs select"
  ON public.crm_report_runs
  FOR SELECT
  TO authenticated
  USING (company_id = public.crm_user_company_id());

CREATE POLICY "CRM report runs insert"
  ON public.crm_report_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.user_is_company_admin(public.crm_user_company_id())
  );

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_crm_report_schedules_updated_at ON public.crm_report_schedules;
CREATE TRIGGER update_crm_report_schedules_updated_at
  BEFORE UPDATE ON public.crm_report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
