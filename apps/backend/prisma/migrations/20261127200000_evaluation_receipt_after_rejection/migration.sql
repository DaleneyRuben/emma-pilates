-- Board C13h (owner 2026-11-27): after a rejected receipt the Client sends
-- another one on a new pending Payment, and the still-booked Evaluation moves
-- to it. Only that move is allowed; everything else protect_evaluation
-- guards stays as 20261029230000 left it. Expand-only.

CREATE OR REPLACE FUNCTION "booking"."protect_evaluation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."subscription_id" IS DISTINCT FROM OLD."subscription_id"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'evaluation reservation is immutable' USING ERRCODE = '55000';
    END IF;
    -- Board C13h (owner 2026-11-27): a booked Evaluation whose transfer was
    -- rejected moves to the Client's new pending evaluation Payment, which
    -- carries another receipt. The rejected Payment stays as history.
    IF NEW."payment_id" IS DISTINCT FROM OLD."payment_id" THEN
        IF OLD."payment_id" IS NULL
            OR NEW."payment_id" IS NULL
            OR OLD."state" <> 'booked'
            OR NEW."state" <> 'booked'
            OR NOT EXISTS (
                SELECT 1 FROM "booking"."payments"
                WHERE "id" = OLD."payment_id"
                  AND "kind" = 'evaluation'
                  AND "state" = 'rejected')
            OR NOT EXISTS (
                SELECT 1 FROM "booking"."payments"
                WHERE "id" = NEW."payment_id"
                  AND "kind" = 'evaluation'
                  AND "state" = 'pending'
                  AND "client_id" = NEW."client_id") THEN
            RAISE EXCEPTION 'evaluation reservation is immutable' USING ERRCODE = '55000';
        END IF;
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
