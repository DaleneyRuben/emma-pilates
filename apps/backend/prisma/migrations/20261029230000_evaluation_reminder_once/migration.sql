-- Restores the reminder-once guard that 20261029220000 dropped when it
-- replaced protect_evaluation for the paid slot move. Each marker is still
-- set once. A confirmed paid Evaluation may still move slot. Expand-only.

CREATE OR REPLACE FUNCTION "booking"."protect_evaluation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."subscription_id" IS DISTINCT FROM OLD."subscription_id"
        OR NEW."payment_id" IS DISTINCT FROM OLD."payment_id"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'evaluation reservation is immutable' USING ERRCODE = '55000';
    END IF;
    -- A reschedule moves the slot. The Payment is unchanged, so the sale is
    -- the same Evaluation (owner, 2026-10-29).
    IF NEW."evaluation_slot_id" <> OLD."evaluation_slot_id"
        OR NEW."eligibility_month" <> OLD."eligibility_month" THEN
        IF NEW."payment_id" IS NULL OR NEW."state" <> 'booked' THEN
            RAISE EXCEPTION 'evaluation reservation is immutable' USING ERRCODE = '55000';
        END IF;
    END IF;
    IF OLD."nutritionist_cost_centavos" IS NOT NULL
        AND NEW."nutritionist_cost_centavos" IS DISTINCT FROM OLD."nutritionist_cost_centavos" THEN
        RAISE EXCEPTION 'evaluation cost is written once' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" IN ('cancelled', 'no_show') AND (
        NEW."state" <> OLD."state"
        OR NEW."cancelled_at" IS DISTINCT FROM OLD."cancelled_at"
        OR NEW."cancelled_by_account_id" IS DISTINCT FROM OLD."cancelled_by_account_id"
        OR NEW."cancellation_cause" IS DISTINCT FROM OLD."cancellation_cause") THEN
        RAISE EXCEPTION 'evaluation outcome is final' USING ERRCODE = '55000';
    END IF;
    IF (OLD."day_reminder_recorded_at" IS NOT NULL
            AND NEW."day_reminder_recorded_at" IS DISTINCT FROM OLD."day_reminder_recorded_at")
        OR (OLD."hour_reminder_recorded_at" IS NOT NULL
            AND NEW."hour_reminder_recorded_at" IS DISTINCT FROM OLD."hour_reminder_recorded_at") THEN
        RAISE EXCEPTION 'evaluation reminder markers are set once' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
