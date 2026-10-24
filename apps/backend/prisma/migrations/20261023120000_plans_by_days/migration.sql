-- BKM-005, booking ADR-0005 and ADR-0006: a Plan lasts 30, 60, or 90 days and
-- may carry a Weekly Cap of 3 or 4 Bookings (60- and 90-day Plans only). The
-- month columns stay, nullable and deprecated: nothing writes them, and the
-- contract derives durationMonths for old builds (ADR-0016).

-- AlterTable
ALTER TABLE "booking"."plans" ADD COLUMN     "duration_days" SMALLINT,
ADD COLUMN     "weekly_class_cap" SMALLINT,
ALTER COLUMN "duration_months" DROP NOT NULL;

-- AlterTable
ALTER TABLE "booking"."purchase_intents" ADD COLUMN     "duration_days_snapshot" SMALLINT,
ADD COLUMN     "weekly_class_cap_snapshot" SMALLINT,
ALTER COLUMN "duration_months_snapshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "booking"."payments" ADD COLUMN     "duration_days_snapshot" SMALLINT,
ADD COLUMN     "weekly_class_cap_snapshot" SMALLINT,
ALTER COLUMN "duration_months_snapshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "booking"."subscriptions" ADD COLUMN     "duration_days_snapshot" SMALLINT,
ADD COLUMN     "weekly_class_cap_snapshot" SMALLINT,
ALTER COLUMN "duration_months_snapshot" DROP NOT NULL;

-- Data: every existing row was defined in months. One month reads as 30 days
-- and three as 90; six and twelve have no day equivalent, so they take the
-- longest validity, 90 days. Subscriptions keep the dates they already have;
-- the snapshot only records which validity they were sold as.
CREATE FUNCTION pg_temp.days_for_months(months SMALLINT)
RETURNS SMALLINT LANGUAGE sql IMMUTABLE AS $$
  SELECT (CASE months WHEN 1 THEN 30 ELSE 90 END)::SMALLINT
$$;

UPDATE "booking"."plans"
  SET "duration_days" = pg_temp.days_for_months("duration_months");
UPDATE "booking"."purchase_intents"
  SET "duration_days_snapshot" = pg_temp.days_for_months("duration_months_snapshot");
UPDATE "booking"."payments"
  SET "duration_days_snapshot" = pg_temp.days_for_months("duration_months_snapshot");
UPDATE "booking"."subscriptions"
  SET "duration_days_snapshot" = pg_temp.days_for_months("duration_months_snapshot");

-- The monthly Plans leave the catalog: hidden, never deleted (BKM-005). The
-- Administrator creates the Plans by days on the admin web (REL-018 loads the
-- eight real ones).
UPDATE "booking"."plans" SET "hidden_at" = now() WHERE "hidden_at" IS NULL;

ALTER TABLE "booking"."plans" ALTER COLUMN "duration_days" SET NOT NULL;
ALTER TABLE "booking"."purchase_intents" ALTER COLUMN "duration_days_snapshot" SET NOT NULL;
ALTER TABLE "booking"."payments" ALTER COLUMN "duration_days_snapshot" SET NOT NULL;
ALTER TABLE "booking"."subscriptions" ALTER COLUMN "duration_days_snapshot" SET NOT NULL;

-- Row checks.
ALTER TABLE "booking"."plans"
  ADD CONSTRAINT "plans_validity_check" CHECK (
    "duration_days" IN (30, 60, 90)
    AND ("weekly_class_cap" IS NULL
      OR ("weekly_class_cap" IN (3, 4) AND "duration_days" > 30))
  );
ALTER TABLE "booking"."purchase_intents"
  ADD CONSTRAINT "purchase_intents_validity_check" CHECK (
    "duration_days_snapshot" IN (30, 60, 90)
    AND ("weekly_class_cap_snapshot" IS NULL
      OR ("weekly_class_cap_snapshot" IN (3, 4) AND "duration_days_snapshot" > 30))
  );
ALTER TABLE "booking"."payments"
  ADD CONSTRAINT "payments_validity_check" CHECK (
    "duration_days_snapshot" IN (30, 60, 90)
    AND ("weekly_class_cap_snapshot" IS NULL
      OR ("weekly_class_cap_snapshot" IN (3, 4) AND "duration_days_snapshot" > 30))
  );
ALTER TABLE "booking"."subscriptions"
  ADD CONSTRAINT "subscriptions_validity_check" CHECK (
    "duration_days_snapshot" IN (30, 60, 90)
    AND ("weekly_class_cap_snapshot" IS NULL
      OR ("weekly_class_cap_snapshot" IN (3, 4) AND "duration_days_snapshot" > 30))
  );

-- The new snapshots are as immutable as the old ones.
CREATE OR REPLACE FUNCTION "booking"."protect_purchase_intent"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."plan_id" <> OLD."plan_id"
        OR NEW."plan_name_snapshot" <> OLD."plan_name_snapshot"
        OR NEW."duration_months_snapshot" IS DISTINCT FROM OLD."duration_months_snapshot"
        OR NEW."duration_days_snapshot" <> OLD."duration_days_snapshot"
        OR NEW."weekly_class_cap_snapshot" IS DISTINCT FROM OLD."weekly_class_cap_snapshot"
        OR NEW."class_allowance_snapshot" <> OLD."class_allowance_snapshot"
        OR NEW."plan_price_centavos" <> OLD."plan_price_centavos"
        OR NEW."credit_reserved_centavos" <> OLD."credit_reserved_centavos"
        OR NEW."amount_due_centavos" <> OLD."amount_due_centavos"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at"
        OR NEW."expires_at" <> OLD."expires_at" THEN
        RAISE EXCEPTION 'purchase intent commercial fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" <> 'open' AND (
        NEW."state" <> OLD."state"
        OR NEW."submitted_at" IS DISTINCT FROM OLD."submitted_at"
        OR NEW."expired_at" IS DISTINCT FROM OLD."expired_at"
        OR NEW."receipt_image_asset_id" IS DISTINCT FROM OLD."receipt_image_asset_id") THEN
        RAISE EXCEPTION 'purchase intent is settled' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

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
        OR NEW."method" <> OLD."method"
        OR NEW."collected_at_branch_id" IS DISTINCT FROM OLD."collected_at_branch_id"
        OR NEW."submitted_by_account_id" <> OLD."submitted_by_account_id"
        OR NEW."submitted_at" <> OLD."submitted_at"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'payment commercial fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" <> 'pending' AND (
        NEW."state" <> OLD."state"
        OR NEW."decided_by_account_id" IS DISTINCT FROM OLD."decided_by_account_id"
        OR NEW."decided_at" IS DISTINCT FROM OLD."decided_at"
        OR NEW."rejection_reason" IS DISTINCT FROM OLD."rejection_reason") THEN
        RAISE EXCEPTION 'payment decision is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
