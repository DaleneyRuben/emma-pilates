-- Review-only SQL for BKO-001: the database-only protections Prisma cannot
-- express. BKO-002 appends this file, byte for byte, to the generated SQL in
-- back-office-review.sql to form 20260924000000_back_office after approval.
--
-- No check compares a column default (now()) with an application-written
-- instant: the fixture-clock failure fixed after ADM-001 came from exactly
-- that pairing, so every time here is either a default or compared with
-- nothing.

-- Supplies ------------------------------------------------------------------

ALTER TABLE "back_office"."supplies"
  ADD CONSTRAINT "supplies_values_check" CHECK (
    length(btrim("name")) > 0
    AND "initial_quantity" >= 0
    AND "quantity_on_hand" >= 0
    AND "low_stock_threshold" >= 0
  );

CREATE UNIQUE INDEX "supplies_branch_active_normalized_name_key"
  ON "back_office"."supplies" ("branch_id", lower(btrim("name")))
  WHERE "archived_at" IS NULL;

-- Supplies, Withdrawals, and Restocks are history: never deleted.
CREATE FUNCTION "back_office"."reject_history_delete"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% rows are never deleted', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

-- A Supply starts with its initial quantity on hand. After that, the quantity
-- changes only through the Withdrawal and Restock triggers below (nested
-- trigger depth), so quantity_on_hand always equals initial_quantity plus
-- Restocks minus Withdrawals. Archival is one-way.
CREATE FUNCTION "back_office"."protect_supply"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."quantity_on_hand" <> NEW."initial_quantity" THEN
            RAISE EXCEPTION 'supply starts with its initial quantity' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
    END IF;
    IF NEW."branch_id" <> OLD."branch_id"
        OR NEW."initial_quantity" <> OLD."initial_quantity"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'supply origin is immutable' USING ERRCODE = '55000';
    END IF;
    IF NEW."quantity_on_hand" <> OLD."quantity_on_hand" AND pg_trigger_depth() < 2 THEN
        RAISE EXCEPTION 'supply quantity changes only through withdrawals and restocks' USING ERRCODE = '55000';
    END IF;
    IF OLD."archived_at" IS NOT NULL AND NEW."archived_at" IS DISTINCT FROM OLD."archived_at" THEN
        RAISE EXCEPTION 'supply archival is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "supplies_protect"
    BEFORE INSERT OR UPDATE ON "back_office"."supplies"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."protect_supply"();

CREATE TRIGGER "supplies_reject_delete"
    BEFORE DELETE ON "back_office"."supplies"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_history_delete"();

-- Withdrawals and Restocks ---------------------------------------------------

ALTER TABLE "back_office"."withdrawals"
  ADD CONSTRAINT "withdrawals_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "back_office"."supply_restocks"
  ADD CONSTRAINT "supply_restocks_quantity_check" CHECK ("quantity" > 0);

-- Recording a movement adjusts the Supply in the same statement. The UPDATE
-- takes the Supply's row lock, so concurrent Withdrawals serialize; the one
-- that would take stock below zero fails supplies_values_check (23514) and
-- its row is never inserted.
CREATE FUNCTION "back_office"."apply_supply_movement"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    delta integer := CASE TG_TABLE_NAME
        WHEN 'withdrawals' THEN -NEW."quantity"
        ELSE NEW."quantity"
    END;
    archived timestamptz;
BEGIN
    UPDATE "back_office"."supplies"
       SET "quantity_on_hand" = "quantity_on_hand" + delta
     WHERE "id" = NEW."supply_id"
     RETURNING "archived_at" INTO archived;
    IF archived IS NOT NULL THEN
        RAISE EXCEPTION 'supply is archived' USING ERRCODE = '55000';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER "withdrawals_apply"
    AFTER INSERT ON "back_office"."withdrawals"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."apply_supply_movement"();

CREATE TRIGGER "supply_restocks_apply"
    AFTER INSERT ON "back_office"."supply_restocks"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."apply_supply_movement"();

CREATE FUNCTION "back_office"."reject_movement_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% rows are immutable and never deleted', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "withdrawals_immutable"
    BEFORE UPDATE OR DELETE ON "back_office"."withdrawals"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_movement_change"();

CREATE TRIGGER "supply_restocks_immutable"
    BEFORE UPDATE OR DELETE ON "back_office"."supply_restocks"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_movement_change"();

-- Salary Payments and Expenses ----------------------------------------------

ALTER TABLE "back_office"."salary_payments"
  ADD CONSTRAINT "salary_payments_amount_check" CHECK ("amount_centavos" > 0);

ALTER TABLE "back_office"."expenses"
  ADD CONSTRAINT "expenses_amount_check" CHECK ("amount_centavos" > 0);

-- Amount, date, Staff Member, and Expense Category may be corrected (audited
-- by the use case); who recorded the row, when, and an Expense's Branch may not.
CREATE FUNCTION "back_office"."protect_money_record"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."recorded_by_account_id" <> OLD."recorded_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION '% origin is immutable', TG_TABLE_NAME USING ERRCODE = '55000';
    END IF;
    -- Nested: salary_payments has no branch_id for PL/pgSQL to resolve.
    IF TG_TABLE_NAME = 'expenses' THEN
        IF NEW."branch_id" <> OLD."branch_id" THEN
            RAISE EXCEPTION 'expense branch is immutable' USING ERRCODE = '55000';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "salary_payments_protect_update"
    BEFORE UPDATE ON "back_office"."salary_payments"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."protect_money_record"();

CREATE TRIGGER "expenses_protect_update"
    BEFORE UPDATE ON "back_office"."expenses"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."protect_money_record"();

-- Provisional answer to open question Q1 (no deletion of money records).
-- Drop these two triggers from the migration if Q1 allows deletion.
CREATE TRIGGER "salary_payments_reject_delete"
    BEFORE DELETE ON "back_office"."salary_payments"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_history_delete"();

CREATE TRIGGER "expenses_reject_delete"
    BEFORE DELETE ON "back_office"."expenses"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_history_delete"();

-- Expense Categories ---------------------------------------------------------

-- A label only. It may be deleted while no Expense references it
-- (expenses_expense_category_id_fkey is ON DELETE RESTRICT).
ALTER TABLE "back_office"."expense_categories"
  ADD CONSTRAINT "expense_categories_name_check" CHECK (length(btrim("name")) > 0);

CREATE UNIQUE INDEX "expense_categories_normalized_name_key"
  ON "back_office"."expense_categories" (lower(btrim("name")));
