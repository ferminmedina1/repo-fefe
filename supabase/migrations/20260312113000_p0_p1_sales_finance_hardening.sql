-- P0 + P1 hardening for Sales/Finance modules
-- - Tighten RLS for delivery notes, returns and credit notes
-- - Harden stock RPC functions with explicit tenant and role checks

BEGIN;

-- =====================================================
-- 1) Enforce RLS on critical tables
-- =====================================================
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.delivery_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.returns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes FORCE ROW LEVEL SECURITY;

-- =====================================================
-- 2) DELIVERY_NOTES policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone authenticated can view delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Admins, managers and employees can create delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Admins and managers can update delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Only admins can delete delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Admins can delete delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Users can view company delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Users can insert company delivery notes" ON public.delivery_notes;
DROP POLICY IF EXISTS "Admins managers can update delivery notes" ON public.delivery_notes;

CREATE POLICY "Users can view company delivery notes"
ON public.delivery_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_notes.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Authorized users can insert company delivery notes"
ON public.delivery_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_notes.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier', 'employee')
  )
);

CREATE POLICY "Admins managers can update company delivery notes"
ON public.delivery_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_notes.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete company delivery notes"
ON public.delivery_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_notes.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 3) DELIVERY_NOTE_ITEMS policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone authenticated can view delivery note items" ON public.delivery_note_items;
DROP POLICY IF EXISTS "Admins, managers and employees can create delivery note items" ON public.delivery_note_items;
DROP POLICY IF EXISTS "Users can view delivery note items from their company" ON public.delivery_note_items;
DROP POLICY IF EXISTS "Users can insert delivery note items for their company" ON public.delivery_note_items;
DROP POLICY IF EXISTS "Users can insert delivery note items in their company" ON public.delivery_note_items;
DROP POLICY IF EXISTS "Users can insert company delivery note items" ON public.delivery_note_items;
DROP POLICY IF EXISTS "Admins managers can update delivery note items" ON public.delivery_note_items;

CREATE POLICY "Users can view company delivery note items"
ON public.delivery_note_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_note_items.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Authorized users can insert company delivery note items"
ON public.delivery_note_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_note_items.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier', 'employee')
  )
);

CREATE POLICY "Admins managers can update company delivery note items"
ON public.delivery_note_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_note_items.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete company delivery note items"
ON public.delivery_note_items FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = delivery_note_items.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 4) RETURNS policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone authenticated can view returns" ON public.returns;
DROP POLICY IF EXISTS "Anyone authenticated can create returns" ON public.returns;
DROP POLICY IF EXISTS "Admins and managers can update returns" ON public.returns;
DROP POLICY IF EXISTS "Only admins can delete returns" ON public.returns;
DROP POLICY IF EXISTS "Users can view company returns" ON public.returns;
DROP POLICY IF EXISTS "Users can insert company returns" ON public.returns;
DROP POLICY IF EXISTS "Admins managers can update returns" ON public.returns;

CREATE POLICY "Users can view company returns"
ON public.returns FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = returns.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Users can insert company returns"
ON public.returns FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = returns.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Admins managers can update company returns"
ON public.returns FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = returns.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete company returns"
ON public.returns FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = returns.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 5) CREDIT_NOTES policies
-- =====================================================
DROP POLICY IF EXISTS "Customers can view their own credit notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Admins and managers can manage credit notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Users can view company credit notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Users can insert company credit notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Admins managers can update credit notes" ON public.credit_notes;

CREATE POLICY "Users can view company credit notes"
ON public.credit_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = credit_notes.company_id
      AND cu.active = true
  )
);

CREATE POLICY "Users can insert company credit notes"
ON public.credit_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = credit_notes.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins managers can update company credit notes"
ON public.credit_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = credit_notes.company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins can delete company credit notes"
ON public.credit_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = credit_notes.company_id
      AND cu.active = true
      AND cu.role = 'admin'
  )
);

-- =====================================================
-- 6) Harden batch stock RPCs
-- =====================================================
CREATE OR REPLACE FUNCTION public.batch_update_product_stock(adjustments jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_id_text text;
  qty_adjustment numeric;
  v_product_company_id uuid;
  v_company_id uuid;
  v_has_access boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR product_id_text, qty_adjustment IN
    SELECT key, value::numeric FROM jsonb_each_text(adjustments)
  LOOP
    SELECT p.company_id INTO v_product_company_id
    FROM public.products p
    WHERE p.id = product_id_text::uuid;

    IF v_product_company_id IS NULL THEN
      RAISE EXCEPTION 'Product % not found', product_id_text;
    END IF;

    IF v_company_id IS NULL THEN
      v_company_id := v_product_company_id;
    ELSIF v_company_id <> v_product_company_id THEN
      RAISE EXCEPTION 'Cross-company stock update is not allowed';
    END IF;
  END LOOP;

  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = v_company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier', 'warehouse', 'employee')
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Insufficient permissions to update product stock';
  END IF;

  FOR product_id_text, qty_adjustment IN
    SELECT key, value::numeric FROM jsonb_each_text(adjustments)
  LOOP
    UPDATE public.products p
    SET stock = GREATEST(0, p.stock + qty_adjustment),
        updated_at = now()
    WHERE p.id = product_id_text::uuid
      AND p.company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found in company scope', product_id_text;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.batch_update_warehouse_stock(
  p_warehouse_id uuid,
  adjustments jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_id_text text;
  qty_adjustment numeric;
  v_company_id uuid;
  v_product_company_id uuid;
  v_has_access boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT w.company_id INTO v_company_id
  FROM public.warehouses w
  WHERE w.id = p_warehouse_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Warehouse % not found', p_warehouse_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = v_company_id
      AND cu.active = true
      AND cu.role IN ('admin', 'manager', 'cashier', 'warehouse', 'employee')
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Insufficient permissions to update warehouse stock';
  END IF;

  FOR product_id_text, qty_adjustment IN
    SELECT key, value::numeric FROM jsonb_each_text(adjustments)
  LOOP
    SELECT p.company_id INTO v_product_company_id
    FROM public.products p
    WHERE p.id = product_id_text::uuid;

    IF v_product_company_id IS NULL THEN
      RAISE EXCEPTION 'Product % not found', product_id_text;
    END IF;

    IF v_product_company_id <> v_company_id THEN
      RAISE EXCEPTION 'Product % does not belong to warehouse company', product_id_text;
    END IF;

    IF qty_adjustment < 0 THEN
      UPDATE public.warehouse_stock ws
      SET stock = GREATEST(0, ws.stock + qty_adjustment),
          updated_at = now()
      WHERE ws.warehouse_id = p_warehouse_id
        AND ws.product_id = product_id_text::uuid
        AND ws.company_id = v_company_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No stock entry for product % in warehouse %', product_id_text, p_warehouse_id;
      END IF;
    ELSE
      INSERT INTO public.warehouse_stock (warehouse_id, product_id, stock, company_id)
      VALUES (p_warehouse_id, product_id_text::uuid, qty_adjustment, v_company_id)
      ON CONFLICT (warehouse_id, product_id)
      DO UPDATE SET
        stock = public.warehouse_stock.stock + qty_adjustment,
        updated_at = now();
    END IF;
  END LOOP;
END;
$$;

-- Restrict and re-grant execute privileges explicitly
REVOKE EXECUTE ON FUNCTION public.batch_update_product_stock(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.batch_update_product_stock(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.batch_update_product_stock(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_product_stock(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.batch_update_warehouse_stock(uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.batch_update_warehouse_stock(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.batch_update_warehouse_stock(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_warehouse_stock(uuid, jsonb) TO authenticated;

COMMIT;
