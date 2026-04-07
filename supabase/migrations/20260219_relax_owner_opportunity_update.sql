-- Allow owner role to update any opportunity in company

DROP POLICY IF EXISTS "CRM opportunities update by role" ON public.crm_opportunities;

CREATE POLICY "CRM opportunities update by role"
  ON public.crm_opportunities
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND (
      public.user_is_company_admin(public.crm_user_company_id())
      OR public.crm_user_role() IN ('admin', 'manager', 'team', 'owner')
    )
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND (
      public.user_is_company_admin(public.crm_user_company_id())
      OR public.crm_user_role() IN ('admin', 'manager', 'team', 'owner')
    )
  );
