-- PAY-006, booking ADR-0012: who voided the sale, when, and why. A void is
-- a state (added in the previous migration), never a DELETE (ADR-0086).
ALTER TABLE "booking"."payments" ADD COLUMN "voided_at" TIMESTAMPTZ(3),
ADD COLUMN "voided_by_account_id" UUID,
ADD COLUMN "void_reason" TEXT;

CREATE INDEX "payments_voided_by_account_id_idx" ON "booking"."payments"("voided_by_account_id");

ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_voided_by_account_id_fkey" FOREIGN KEY ("voided_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A confirmed sale may become voided, once, and only those three columns move.
-- Every other decision stays final (booking ADR-0012).
CREATE OR REPLACE FUNCTION "booking"."protect_payment"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
        OR NEW."collected_at_branch_id" IS DISTINCT FROM OLD."collected_at_branch_id"
        OR NEW."submitted_by_account_id" <> OLD."submitted_by_account_id"
        OR NEW."submitted_at" <> OLD."submitted_at"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'payment commercial fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" = 'voided' THEN
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

-- Cash, Credit-only, and courtesy are created confirmed. A void keeps that
-- shape and only changes the state (booking ADR-0012).
ALTER TABLE "booking"."payments"
  DROP CONSTRAINT "payments_method_fields_check",
  ADD CONSTRAINT "payments_method_fields_check" CHECK (
    ("method" = 'transfer'
      AND "purchase_intent_id" IS NOT NULL
      AND "collected_at_branch_id" IS NULL
      AND "amount_due_centavos" > 0)
    OR ("method" = 'cash'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NOT NULL
      AND "amount_due_centavos" > 0
      AND "state" IN ('confirmed', 'voided')
      AND "decided_by_account_id" = "submitted_by_account_id")
    OR ("method" = 'credit_only'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NULL
      AND "amount_due_centavos" = 0
      AND "state" IN ('confirmed', 'voided')
      AND "decided_by_account_id" = "submitted_by_account_id")
    OR ("method" = 'courtesy'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NULL
      AND "plan_price_centavos" = 0
      AND "amount_due_centavos" = 0
      AND "state" IN ('confirmed', 'voided')
      AND "decided_by_account_id" = "submitted_by_account_id")
  );

-- A void keeps the original decision and adds its own author, time, and reason.
ALTER TABLE "booking"."payments"
  DROP CONSTRAINT "payments_state_fields_check",
  ADD CONSTRAINT "payments_state_fields_check" CHECK (
    ("state" = 'pending'
      AND "decided_by_account_id" IS NULL
      AND "decided_at" IS NULL
      AND "rejection_reason" IS NULL)
    OR ("state" = 'confirmed'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NULL
      AND "decided_at" >= "submitted_at")
    OR ("state" = 'rejected'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NOT NULL
      AND char_length(btrim("rejection_reason")) BETWEEN 1 AND 300
      AND "decided_at" >= "submitted_at")
    OR ("state" = 'voided'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NULL
      AND "decided_at" >= "submitted_at"
      AND "voided_at" >= "decided_at")
  );

-- A void may end a Subscription the day before it started, so it covers no
-- day. PostgreSQL refuses a subquery in a check, so a voided Payment's
-- Subscription is the one case that may end before it starts.
ALTER TABLE "booking"."subscriptions" DROP CONSTRAINT "subscriptions_values_check";
ALTER TABLE "booking"."subscriptions"
  ADD COLUMN "ended_by_void" BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT "subscriptions_values_check" CHECK (
    length(btrim(plan_name_snapshot)) > 0
    AND (duration_months_snapshot IS NULL OR duration_months_snapshot IN (1, 3, 6, 12))
    AND duration_days_snapshot IN (30, 60, 90)
    AND original_class_allowance > 0
    AND remaining_class_allowance BETWEEN 0 AND original_class_allowance
    AND (ends_on >= starts_on OR ended_by_void)
  );

-- A voided sale keeps the Subscription it activated; the row ends, it is not removed.
CREATE OR REPLACE FUNCTION "booking"."assert_payment_subscription_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_payment_id UUID;
    payment_state "booking"."PaymentState";
    subscription_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'payments' THEN
        target_payment_id := NEW."id";
    ELSE
        target_payment_id := NEW."payment_id";
        IF target_payment_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state" INTO payment_state FROM "booking"."payments" WHERE "id" = target_payment_id;
    SELECT count(*) INTO subscription_count FROM "booking"."subscriptions" WHERE "payment_id" = target_payment_id;

    IF payment_state IN ('confirmed', 'voided') AND subscription_count <> 1 THEN
        RAISE EXCEPTION 'confirmed payment % must have exactly one subscription', target_payment_id USING ERRCODE = '23514';
    END IF;
    IF payment_state NOT IN ('confirmed', 'voided') AND subscription_count <> 0 THEN
        RAISE EXCEPTION 'payment % is not confirmed and cannot have a subscription', target_payment_id USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

-- A voided sale names its reason and its author; every other state names neither.
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_void_complete_check" CHECK (
  ("state" = 'voided') = (
    "voided_at" IS NOT NULL
    AND "voided_by_account_id" IS NOT NULL
    AND "void_reason" IS NOT NULL
    AND length(btrim("void_reason")) > 0
  )
);
