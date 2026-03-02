-- Fix CRM activity log RLS for multi-company users
-- Root cause: previous policies depended on crm_user_company_id(),
-- which returns a single company and fails when users belong to multiple companies.

ALTER TABLE public.crm_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CRM activity logs insert by system" ON public.crm_activity_log;
DROP POLICY IF EXISTS "CRM activity logs insert by authenticated user" ON public.crm_activity_log;
DROP POLICY IF EXISTS "CRM activity logs insert by membership" ON public.crm_activity_log;
DROP POLICY IF EXISTS "CRM activity logs select by role" ON public.crm_activity_log;
DROP POLICY IF EXISTS "CRM activity logs select by membership" ON public.crm_activity_log;

CREATE POLICY "CRM activity logs insert by membership"
  ON public.crm_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = crm_activity_log.company_id
    )
  );

CREATE POLICY "CRM activity logs select by membership"
  ON public.crm_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = crm_activity_log.company_id
    )
  );
