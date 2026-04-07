-- =============================================
-- Grant accountant role create/edit access on all finance modules
-- Previously: only admin + manager could INSERT/UPDATE bank_accounts
-- Now: admin + manager + accountant
-- =============================================

-- bank_accounts: UPDATE
DROP POLICY IF EXISTS "Admins and managers can update bank accounts" ON public.bank_accounts;
CREATE POLICY "Finance roles can update bank accounts"
  ON public.bank_accounts FOR UPDATE
  USING (
    company_id IN (SELECT get_user_companies(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = bank_accounts.company_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'manager', 'accountant')
        AND cu.active = true
    )
  );

-- bank_accounts: INSERT
DROP POLICY IF EXISTS "Admins and managers can insert bank accounts" ON public.bank_accounts;
CREATE POLICY "Finance roles can insert bank accounts"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (
    company_id IN (SELECT get_user_companies(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = bank_accounts.company_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'manager', 'accountant')
        AND cu.active = true
    )
  );

-- bank_movements: UPDATE (reconcile)
DROP POLICY IF EXISTS "Admins and managers can update bank movements" ON public.bank_movements;
CREATE POLICY "Finance roles can update bank movements"
  ON public.bank_movements FOR UPDATE
  USING (
    company_id IN (SELECT get_user_companies(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = bank_movements.company_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'manager', 'accountant')
        AND cu.active = true
    )
  );

-- card_movements: UPDATE (accredit)
DROP POLICY IF EXISTS "Admins and managers can update card movements" ON public.card_movements;
CREATE POLICY "Finance roles can update card movements"
  ON public.card_movements FOR UPDATE
  USING (
    company_id IN (SELECT get_user_companies(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = card_movements.company_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'manager', 'accountant')
        AND cu.active = true
    )
  );

-- retentions: UPDATE
DROP POLICY IF EXISTS "Admins managers can update retentions" ON public.retentions;
DROP POLICY IF EXISTS "Admins and managers can update retentions" ON public.retentions;
CREATE POLICY "Finance roles can update retentions"
  ON public.retentions FOR UPDATE
  USING (
    company_id IN (SELECT get_user_companies(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.company_id = retentions.company_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'manager', 'accountant')
        AND cu.active = true
    )
  );

-- role_permissions table: upsert accountant permissions for finance modules
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_export) VALUES
  ('accountant', 'bank_accounts',  true, true, true, false, true),
  ('accountant', 'bank_movements', true, true, true, false, true),
  ('accountant', 'card_movements', true, true, true, false, true),
  ('accountant', 'retentions',     true, true, true, false, true)
ON CONFLICT (role, module) DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit   = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  can_export = EXCLUDED.can_export;
