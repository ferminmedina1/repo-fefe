-- Fix RLS policies for inventory_alert_rules: use company_users instead of profiles
DROP POLICY IF EXISTS "Users can view own company alert rules" ON public.inventory_alert_rules;
DROP POLICY IF EXISTS "Users can insert own company alert rules" ON public.inventory_alert_rules;
DROP POLICY IF EXISTS "Users can update own company alert rules" ON public.inventory_alert_rules;
DROP POLICY IF EXISTS "Users can delete own company alert rules" ON public.inventory_alert_rules;

CREATE POLICY "Users can view own company alert rules"
  ON public.inventory_alert_rules FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "Users can insert own company alert rules"
  ON public.inventory_alert_rules FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "Users can update own company alert rules"
  ON public.inventory_alert_rules FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND active = true
  ));

CREATE POLICY "Users can delete own company alert rules"
  ON public.inventory_alert_rules FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND active = true
  ));
