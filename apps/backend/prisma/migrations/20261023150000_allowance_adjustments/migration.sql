-- BKM-008, booking ADR-0006: extra classes are Allowance Adjustments with a
-- reason and an author, never an edit of the Plan's allowance or the
-- Payment. A removal is deleted_at (ADR-0086). One live gift per Client,
-- ever, so a retried confirmation cannot grant it twice.

-- CreateEnum
CREATE TYPE "booking"."AllowanceAdjustmentReason" AS ENUM ('gift_new_client', 'invite_converted', 'campaign', 'courtesy', 'class_return', 'consumption');

-- CreateTable
-- client_id is the Subscription's Client, stored here because PostgreSQL
-- cannot put a subquery in a unique index. One live gift per Client.
CREATE TABLE "booking"."allowance_adjustments" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "classes" SMALLINT NOT NULL,
    "reason" "booking"."AllowanceAdjustmentReason" NOT NULL,
    "author_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "allowance_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "allowance_adjustments_subscription_id_created_at_idx" ON "booking"."allowance_adjustments"("subscription_id", "created_at");

-- CreateIndex
CREATE INDEX "allowance_adjustments_author_account_id_idx" ON "booking"."allowance_adjustments"("author_account_id");

-- One gift in a Client's life, among rows that have not been removed.
CREATE UNIQUE INDEX "allowance_adjustments_one_live_gift_per_client"
  ON "booking"."allowance_adjustments" ("client_id")
  WHERE "reason" = 'gift_new_client' AND "deleted_at" IS NULL;

-- A signed number, never zero: a gift adds, a correction may take back.
ALTER TABLE "booking"."allowance_adjustments"
  ADD CONSTRAINT "allowance_adjustments_classes_check" CHECK ("classes" <> 0);

-- PostgreSQL refuses a subquery in a check, so a trigger keeps client_id
-- equal to the Subscription's client.
CREATE FUNCTION "booking"."allowance_adjustments_client_matches"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "booking"."subscriptions"
    WHERE "id" = NEW."subscription_id" AND "client_id" = NEW."client_id"
  ) THEN
    RAISE EXCEPTION 'allowance adjustment client does not match its subscription'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "allowance_adjustments_client_matches"
  BEFORE INSERT OR UPDATE ON "booking"."allowance_adjustments"
  FOR EACH ROW EXECUTE FUNCTION "booking"."allowance_adjustments_client_matches"();

-- AddForeignKey
ALTER TABLE "booking"."allowance_adjustments" ADD CONSTRAINT "allowance_adjustments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "booking"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."allowance_adjustments" ADD CONSTRAINT "allowance_adjustments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."allowance_adjustments" ADD CONSTRAINT "allowance_adjustments_author_account_id_fkey" FOREIGN KEY ("author_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
