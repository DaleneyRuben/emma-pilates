-- BKM-006, booking ADR-0005: the Start Date is chosen at purchase and kept
-- on the Purchase Intent and the Payment. Existing rows were sold to start
-- the day the Payment was confirmed, which is their Bolivia confirmation date.
-- Subscription.starts_on stays the date the booking check reads.

ALTER TABLE "booking"."purchase_intents" ADD COLUMN "starts_on" DATE;
ALTER TABLE "booking"."payments" ADD COLUMN "starts_on" DATE;

UPDATE "booking"."purchase_intents"
  SET "starts_on" = (("created_at" AT TIME ZONE 'America/La_Paz')::date);
UPDATE "booking"."payments"
  SET "starts_on" = ((coalesce("decided_at", "submitted_at") AT TIME ZONE 'America/La_Paz')::date);

ALTER TABLE "booking"."purchase_intents" ALTER COLUMN "starts_on" SET NOT NULL;
ALTER TABLE "booking"."payments" ALTER COLUMN "starts_on" SET NOT NULL;

-- Early Renewal keeps the current Subscription active and adds one future
-- active row. The old one-active index forbade that pair. now() is not
-- immutable, so the replacement cannot be a partial unique index: at most one
-- active row already in force, and at most one active row that starts later.
DROP INDEX "booking"."subscriptions_one_active_per_client_key";

CREATE FUNCTION "booking"."reject_second_current_subscription"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."state" = 'active'
        AND NEW."starts_on" <= (NEW."activated_at" AT TIME ZONE 'America/La_Paz')::date
        AND EXISTS (
            SELECT 1 FROM "booking"."subscriptions"
            WHERE "client_id" = NEW."client_id"
              AND "state" = 'active'
              AND "starts_on" <= (NEW."activated_at" AT TIME ZONE 'America/La_Paz')::date
              AND "ends_on" >= (NEW."activated_at" AT TIME ZONE 'America/La_Paz')::date
              AND "id" <> NEW."id"
        ) THEN
        RAISE EXCEPTION 'a current subscription already exists'
            USING ERRCODE = '23505', CONSTRAINT = 'subscriptions_one_current';
    END IF;
    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "subscriptions_one_current"
    AFTER INSERT ON "booking"."subscriptions"
    DEFERRABLE INITIALLY IMMEDIATE
    FOR EACH ROW EXECUTE FUNCTION "booking"."reject_second_current_subscription"();

-- One future Subscription per Client. The client-row lock serializes the
-- race and this trigger refuses a second insert that the lock already made
-- visible.
CREATE FUNCTION "booking"."reject_second_future_subscription"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."state" = 'active'
        AND NEW."starts_on" > (NEW."activated_at" AT TIME ZONE 'America/La_Paz')::date
        AND EXISTS (
            SELECT 1 FROM "booking"."subscriptions"
            WHERE "client_id" = NEW."client_id"
              AND "state" = 'active'
              AND "starts_on" > (NEW."activated_at" AT TIME ZONE 'America/La_Paz')::date
              AND "id" <> NEW."id"
        ) THEN
        RAISE EXCEPTION 'a future subscription already exists'
            USING ERRCODE = '23505', CONSTRAINT = 'subscriptions_one_future';
    END IF;
    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "subscriptions_one_future"
    AFTER INSERT ON "booking"."subscriptions"
    DEFERRABLE INITIALLY IMMEDIATE
    FOR EACH ROW EXECUTE FUNCTION "booking"."reject_second_future_subscription"();

-- The chosen date is as immutable as the other commercial fields.
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
        OR NEW."starts_on" <> OLD."starts_on"
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
        OR NEW."starts_on" <> OLD."starts_on"
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
