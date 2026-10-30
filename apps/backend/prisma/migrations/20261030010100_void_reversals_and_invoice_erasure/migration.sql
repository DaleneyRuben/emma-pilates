-- FIX-004, review H9: closing an Account erases the invoice data of every
-- sale, a voided one included, while every other field of a voided sale
-- stays final. Owner decision 3: a void closes the Client's waitlist
-- entries with closure reason payment_voided, by the Administrator.

CREATE OR REPLACE FUNCTION "booking"."protect_payment"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    erased "booking"."payments";
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."plan_id" <> OLD."plan_id"
        OR NEW."purchase_intent_id" IS DISTINCT FROM OLD."purchase_intent_id"
        OR NEW."plan_name_snapshot" <> OLD."plan_name_snapshot"
        OR NEW."duration_months_snapshot" IS DISTINCT FROM OLD."duration_months_snapshot"
        OR NEW."duration_days_snapshot" <> OLD."duration_days_snapshot"
        OR NEW."weekly_class_cap_snapshot" IS DISTINCT FROM OLD."weekly_class_cap_snapshot"
        OR NEW."class_allowance_snapshot" <> OLD."class_allowance_snapshot"
        OR NEW."plan_price_centavos" <> OLD."plan_price_centavos"
        OR NEW."credit_applied_centavos" <> OLD."credit_applied_centavos"
        OR NEW."amount_due_centavos" <> OLD."amount_due_centavos"
        OR NEW."starts_on" <> OLD."starts_on"
        OR NEW."method" <> OLD."method"
        OR NEW."kind" <> OLD."kind"
        OR NEW."collected_at_branch_id" IS DISTINCT FROM OLD."collected_at_branch_id"
        OR NEW."submitted_by_account_id" <> OLD."submitted_by_account_id"
        OR NEW."submitted_at" <> OLD."submitted_at"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'payment commercial fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" = 'voided' THEN
        -- Account closure erases the NIT or CI and the name (PAY-007, H9).
        -- That is the one change a voided sale still takes.
        erased := OLD;
        erased."invoice_tax_id" := NULL;
        erased."invoice_name" := NULL;
        erased."updated_at" := NEW."updated_at";
        IF ROW(NEW.*) IS NOT DISTINCT FROM ROW(erased.*) THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'payment decision is final' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" = 'confirmed' AND NEW."state" = 'voided' THEN
        IF NEW."decided_by_account_id" IS DISTINCT FROM OLD."decided_by_account_id"
            OR NEW."decided_at" IS DISTINCT FROM OLD."decided_at"
            OR NEW."rejection_reason" IS DISTINCT FROM OLD."rejection_reason" THEN
            RAISE EXCEPTION 'payment decision is final' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
    END IF;
    IF OLD."state" <> 'pending' AND (
        NEW."state" <> OLD."state"
        OR NEW."decided_by_account_id" IS DISTINCT FROM OLD."decided_by_account_id"
        OR NEW."decided_at" IS DISTINCT FROM OLD."decided_at"
        OR NEW."rejection_reason" IS DISTINCT FROM OLD."rejection_reason"
        OR NEW."voided_at" IS DISTINCT FROM OLD."voided_at"
        OR NEW."voided_by_account_id" IS DISTINCT FROM OLD."voided_by_account_id"
        OR NEW."void_reason" IS DISTINCT FROM OLD."void_reason") THEN
        RAISE EXCEPTION 'payment decision is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE "booking"."waitlist_entries"
  DROP CONSTRAINT "waitlist_entries_state_fields_check",
  ADD CONSTRAINT "waitlist_entries_state_fields_check" CHECK (
    ("closed_at" IS NULL
      AND "closure_reason" IS NULL
      AND "closed_by_account_id" IS NULL
      AND "promoted_booking_id" IS NULL)
    OR ("closed_at" IS NOT NULL
      AND "closure_reason" IN ('left', 'payment_voided')
      AND "closed_by_account_id" IS NOT NULL
      AND "promoted_booking_id" IS NULL
      AND "closed_at" >= "joined_at")
    OR ("closed_at" IS NOT NULL
      AND "closure_reason" = 'promoted'
      AND "closed_by_account_id" IS NULL
      AND "promoted_booking_id" IS NOT NULL
      AND "closed_at" >= "joined_at")
    OR ("closed_at" IS NOT NULL
      AND "closure_reason" IN ('session_cancelled', 'session_started')
      AND "closed_by_account_id" IS NULL
      AND "promoted_booking_id" IS NULL
      AND "closed_at" >= "joined_at")
  );
