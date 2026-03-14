-- P0 hardening for Finance module
-- Tables: bank_accounts, bank_movements, card_movements, expenses, checks, retentions

BEGIN;

-- =====================================================
-- 1) Enforce RLS on all finance tables
-- =====================================================
ALTER TABLE public.bank_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retentions          ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bank_accounts       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bank_movements      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.card_movements      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.expenses            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.checks              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.retentions          FORCE ROW LEVEL SECURITY;

-- =====================================================
-- 2) BANK_ACCOUNTS policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own company bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert own company bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins managers can update bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can delete bank accounts" ON public.bank_accounts;

CREATE POLICY "Users can view own company bank accounts"
ON public.bank_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_accounts.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Admins managers can insert bank accounts"
ON public.bank_accounts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_accounts.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins managers can update bank accounts"
ON public.bank_accounts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_accounts.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete bank accounts"
ON public.bank_accounts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_accounts.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 3) BANK_MOVEMENTS policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own company bank movements" ON public.bank_movements;
DROP POLICY IF EXISTS "Authorized users can insert bank movements" ON public.bank_movements;
DROP POLICY IF EXISTS "Admins managers can update bank movements" ON public.bank_movements;
DROP POLICY IF EXISTS "Admins can delete bank movements" ON public.bank_movements;

CREATE POLICY "Users can view own company bank movements"
ON public.bank_movements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_movements.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Authorized users can insert bank movements"
ON public.bank_movements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_movements.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier')
  )
);

CREATE POLICY "Admins managers can update bank movements"
ON public.bank_movements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_movements.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier')
  )
);

CREATE POLICY "Admins can delete bank movements"
ON public.bank_movements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = bank_movements.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 4) CARD_MOVEMENTS policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own company card movements" ON public.card_movements;
DROP POLICY IF EXISTS "Authorized users can insert card movements" ON public.card_movements;
DROP POLICY IF EXISTS "Admins managers can update card movements" ON public.card_movements;
DROP POLICY IF EXISTS "Admins can delete card movements" ON public.card_movements;

CREATE POLICY "Users can view own company card movements"
ON public.card_movements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = card_movements.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Authorized users can insert card movements"
ON public.card_movements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = card_movements.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier')
  )
);

CREATE POLICY "Admins managers can update card movements"
ON public.card_movements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = card_movements.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier')
  )
);

CREATE POLICY "Admins can delete card movements"
ON public.card_movements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = card_movements.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 5) EXPENSES policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own company expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authorized users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins managers can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

CREATE POLICY "Users can view own company expenses"
ON public.expenses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = expenses.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Authorized users can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = expenses.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier', 'employee')
  )
);

CREATE POLICY "Admins managers can update expenses"
ON public.expenses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = expenses.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete expenses"
ON public.expenses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = expenses.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 6) CHECKS policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own company checks" ON public.checks;
DROP POLICY IF EXISTS "Authorized users can insert checks" ON public.checks;
DROP POLICY IF EXISTS "Admins managers can update checks" ON public.checks;
DROP POLICY IF EXISTS "Admins can delete checks" ON public.checks;

CREATE POLICY "Users can view own company checks"
ON public.checks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = checks.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Authorized users can insert checks"
ON public.checks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = checks.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier')
  )
);

CREATE POLICY "Admins managers can update checks"
ON public.checks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = checks.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier')
  )
);

CREATE POLICY "Admins can delete checks"
ON public.checks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = checks.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 7) RETENTIONS policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own company retentions" ON public.retentions;
DROP POLICY IF EXISTS "Authorized users can insert retentions" ON public.retentions;
DROP POLICY IF EXISTS "Admins managers can update retentions" ON public.retentions;
DROP POLICY IF EXISTS "Admins can delete retentions" ON public.retentions;

CREATE POLICY "Users can view own company retentions"
ON public.retentions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = retentions.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Authorized users can insert retentions"
ON public.retentions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = retentions.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier')
  )
);

CREATE POLICY "Admins managers can update retentions"
ON public.retentions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = retentions.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete retentions"
ON public.retentions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = retentions.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

COMMIT;
