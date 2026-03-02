-- RPC for atomic batch stock decrement (avoids race conditions)
-- Usage: SELECT batch_update_product_stock('{"id1": -5, "id2": -3, "id3": 10}'::jsonb);
-- Positive values = increment, Negative values = decrement

CREATE OR REPLACE FUNCTION batch_update_product_stock(adjustments jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_id_text text;
  qty_adjustment numeric;
BEGIN
  FOR product_id_text, qty_adjustment IN
    SELECT key, value::numeric FROM jsonb_each_text(adjustments)
  LOOP
    UPDATE products
    SET stock = GREATEST(0, stock + qty_adjustment),
        updated_at = now()
    WHERE id = product_id_text::uuid;
  END LOOP;
END;
$$;

-- RPC for atomic batch warehouse stock update
-- Derives company_id from the warehouse automatically
CREATE OR REPLACE FUNCTION batch_update_warehouse_stock(
  p_warehouse_id uuid,
  adjustments jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_id_text text;
  qty_adjustment numeric;
  v_company_id uuid;
BEGIN
  -- Derive company_id from warehouse (needed for INSERT of new rows)
  SELECT company_id INTO v_company_id
  FROM warehouses
  WHERE id = p_warehouse_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Warehouse % not found', p_warehouse_id;
  END IF;

  FOR product_id_text, qty_adjustment IN
    SELECT key, value::numeric FROM jsonb_each_text(adjustments)
  LOOP
    IF qty_adjustment < 0 THEN
      -- Decrement: row MUST exist, fail otherwise
      UPDATE warehouse_stock
      SET stock = GREATEST(0, stock + qty_adjustment),
          updated_at = now()
      WHERE warehouse_id = p_warehouse_id
        AND product_id = product_id_text::uuid;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No stock entry for product % in warehouse %', product_id_text, p_warehouse_id;
      END IF;
    ELSE
      -- Increment: upsert (create row if needed)
      INSERT INTO warehouse_stock (warehouse_id, product_id, stock, company_id)
      VALUES (p_warehouse_id, product_id_text::uuid, qty_adjustment, v_company_id)
      ON CONFLICT (warehouse_id, product_id)
      DO UPDATE SET
        stock = warehouse_stock.stock + qty_adjustment,
        updated_at = now();
    END IF;
  END LOOP;
END;
$$;

-- RPC for platform admin: efficient grouped counts
CREATE OR REPLACE FUNCTION get_platform_usage_metrics(
  p_start_of_month timestamptz,
  p_last_month_start timestamptz
)
RETURNS TABLE (
  company_id uuid,
  company_name text,
  sales_this_month bigint,
  active_products bigint,
  active_users bigint,
  last_month_sales bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id AS company_id,
    c.name AS company_name,
    COALESCE(s.cnt, 0) AS sales_this_month,
    COALESCE(p.cnt, 0) AS active_products,
    COALESCE(u.cnt, 0) AS active_users,
    COALESCE(lm.cnt, 0) AS last_month_sales
  FROM companies c
  LEFT JOIN (
    SELECT company_id, COUNT(*) AS cnt
    FROM sales
    WHERE created_at >= p_start_of_month
    GROUP BY company_id
  ) s ON s.company_id = c.id
  LEFT JOIN (
    SELECT company_id, COUNT(*) AS cnt
    FROM products
    WHERE active = true
    GROUP BY company_id
  ) p ON p.company_id = c.id
  LEFT JOIN (
    SELECT company_id, COUNT(*) AS cnt
    FROM company_users
    WHERE active = true
    GROUP BY company_id
  ) u ON u.company_id = c.id
  LEFT JOIN (
    SELECT company_id, COUNT(*) AS cnt
    FROM sales
    WHERE created_at >= p_last_month_start
      AND created_at < p_start_of_month
    GROUP BY company_id
  ) lm ON lm.company_id = c.id
  WHERE c.active = true;
$$;
