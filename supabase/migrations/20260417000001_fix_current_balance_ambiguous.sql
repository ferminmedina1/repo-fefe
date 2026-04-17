-- Fix: ambiguous column reference "current_balance" in update_customer_balance()
-- The local variable shared its name with customers.current_balance column,
-- causing error 42702 when billing a delivery note (facturar remito).
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_new_balance DECIMAL(12,2);
BEGIN
    SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
    INTO v_new_balance
    FROM customer_account_movements
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id);

    UPDATE customers
    SET current_balance = v_new_balance
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

    UPDATE customer_account_movements
    SET balance = (
        SELECT COALESCE(SUM(cam2.debit_amount - cam2.credit_amount), 0)
        FROM customer_account_movements cam2
        WHERE cam2.customer_id = customer_account_movements.customer_id
          AND (cam2.movement_date < customer_account_movements.movement_date
               OR (cam2.movement_date = customer_account_movements.movement_date
                   AND cam2.id <= customer_account_movements.id))
    )
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
