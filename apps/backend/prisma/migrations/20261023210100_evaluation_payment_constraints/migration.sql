-- NUT-003, booking ADR-0011: a paid Evaluation is a Payment of its own, with
-- no Subscription. A slot is held while that Payment is pending and released
-- if it is not approved. A held Evaluation records what the studio owes the
-- Nutritionist. Nothing is deleted (ADR-0086).

ALTER TABLE "booking"."payments"
  ADD COLUMN "kind" "booking"."PaymentKind" NOT NULL DEFAULT 'plan';

ALTER TABLE "booking"."evaluations"
  ALTER COLUMN "subscription_id" DROP NOT NULL,
  ADD COLUMN "payment_id" UUID,
  ADD COLUMN "nutritionist_cost_centavos" INTEGER;

CREATE UNIQUE INDEX "evaluations_payment_id_key"
  ON "booking"."evaluations" ("payment_id");

ALTER TABLE "booking"."evaluations"
  ADD CONSTRAINT "evaluations_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "booking"."payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- An Evaluation transfer has no Purchase Intent: the slot hold is the
-- Evaluation, not a Plan sale. Cash is still confirmed at a Branch. A worker
-- expiry has no Account, so that one cancellation may leave the actor null.
ALTER TABLE "booking"."payments"
  DROP CONSTRAINT "payments_method_fields_check",
  ADD CONSTRAINT "payments_method_fields_check" CHECK (
    ("kind" = 'plan'
      AND "method" = 'transfer'
      AND "purchase_intent_id" IS NOT NULL
      AND "collected_at_branch_id" IS NULL
      AND "amount_due_centavos" > 0)
    OR ("kind" = 'evaluation'
      AND "method" = 'transfer'
      AND "purchase_intent_id" IS NULL
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

-- An included Evaluation names its Subscription. A paid one names its Payment
-- and no Subscription. The cost is written once the Evaluation is held. A
-- worker expiry may cancel without an Account.
ALTER TABLE "booking"."evaluations"
  DROP CONSTRAINT "evaluations_state_check",
  ADD CONSTRAINT "evaluations_state_check" CHECK (
    ("state" = 'booked'
      AND "cancelled_at" IS NULL
      AND "cancelled_by_account_id" IS NULL
      AND "cancellation_cause" IS NULL
      AND ("nutritionist_cost_centavos" IS NULL
        OR "nutritionist_cost_centavos" >= 0))
    OR ("state" = 'cancelled'
      AND "cancelled_at" IS NOT NULL
      AND "cancellation_cause" IS NOT NULL
      AND "cancelled_at" >= "created_at"
      AND ("nutritionist_cost_centavos" IS NULL
        OR "nutritionist_cost_centavos" >= 0)
      AND (
        ("cancellation_cause" = 'payment_expired'
          AND "cancelled_by_account_id" IS NULL)
        OR ("cancellation_cause" <> 'payment_expired'
          AND "cancelled_by_account_id" IS NOT NULL)
      ))
    OR ("state" = 'no_show'
      AND "cancelled_at" IS NULL
      AND "cancelled_by_account_id" IS NULL
      AND "cancellation_cause" IS NULL
      AND "nutritionist_cost_centavos" IS NOT NULL
      AND "nutritionist_cost_centavos" >= 0)
  ),
  ADD CONSTRAINT "evaluations_payment_check" CHECK (
    ("subscription_id" IS NOT NULL AND "payment_id" IS NULL)
    OR ("subscription_id" IS NULL AND "payment_id" IS NOT NULL)
  );

-- A no-show occupies the slot the way a booked Evaluation does.
DROP INDEX "booking"."evaluations_one_booked_per_slot_key";
CREATE UNIQUE INDEX "evaluations_one_live_per_slot_key"
  ON "booking"."evaluations" ("evaluation_slot_id")
  WHERE "state" IN ('booked', 'no_show');

-- The included Evaluation is one per Subscription, not one per month.
DROP INDEX "booking"."evaluations_one_booked_per_client_month_key";
CREATE UNIQUE INDEX "evaluations_one_included_per_subscription_key"
  ON "booking"."evaluations" ("subscription_id")
  WHERE "subscription_id" IS NOT NULL
    AND "state" IN ('booked', 'no_show');

-- A worker release rejects the Evaluation Payment without an Account.
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
      AND "rejection_reason" IS NOT NULL
      AND char_length(btrim("rejection_reason")) BETWEEN 1 AND 300
      AND "rejection_reason" = btrim("rejection_reason")
      AND (
        ("kind" = 'evaluation'
          AND "decided_by_account_id" IS NULL
          AND "decided_at" IS NOT NULL
          AND "decided_at" >= "submitted_at")
        OR ("kind" <> 'evaluation'
          AND "decided_by_account_id" IS NOT NULL
          AND "decided_at" IS NOT NULL
          AND "decided_at" >= "submitted_at")
      ))
    OR ("state" = 'voided'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NULL
      AND "decided_at" >= "submitted_at"
      AND "voided_at" >= "decided_at")
  );

-- A pending transfer holds the slot. A confirmed or voided one has held it.
CREATE OR REPLACE FUNCTION "booking"."assert_payment_subscription_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_payment_id UUID;
    payment_state "booking"."PaymentState";
    payment_kind "booking"."PaymentKind";
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

    SELECT "state", "kind" INTO payment_state, payment_kind
    FROM "booking"."payments" WHERE "id" = target_payment_id;
    SELECT count(*) INTO subscription_count
    FROM "booking"."subscriptions" WHERE "payment_id" = target_payment_id;

    IF payment_kind = 'evaluation' AND subscription_count <> 0 THEN
        RAISE EXCEPTION 'evaluation payment % cannot have a subscription', target_payment_id
          USING ERRCODE = '23514';
    END IF;
    IF payment_kind = 'plan' AND payment_state IN ('confirmed', 'voided')
        AND subscription_count <> 1 THEN
        RAISE EXCEPTION 'confirmed payment % must have exactly one subscription', target_payment_id
          USING ERRCODE = '23514';
    END IF;
    IF payment_kind = 'plan' AND payment_state NOT IN ('confirmed', 'voided')
        AND subscription_count <> 0 THEN
        RAISE EXCEPTION 'payment % is not confirmed and cannot have a subscription', target_payment_id
          USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

-- The commercial fields of an Evaluation Payment are immutable, including kind.
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
        OR NEW."kind" <> OLD."kind"
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

-- An included Evaluation may become held or a no-show. A paid one is booked
-- until its Payment is confirmed, then held. The cost is written once.
CREATE OR REPLACE FUNCTION "booking"."protect_evaluation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."evaluation_slot_id" <> OLD."evaluation_slot_id"
        OR NEW."eligibility_month" <> OLD."eligibility_month"
        OR NEW."subscription_id" IS DISTINCT FROM OLD."subscription_id"
        OR NEW."payment_id" IS DISTINCT FROM OLD."payment_id"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'evaluation reservation is immutable' USING ERRCODE = '55000';
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
