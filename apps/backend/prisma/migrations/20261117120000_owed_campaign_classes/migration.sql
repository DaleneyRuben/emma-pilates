-- FIX-064 (walkthrough finding 90, owner approval «Si» 2026-11-17, booking
-- ADR-0014): a campaign reaches every active Client. One owed with no current
-- Subscription keeps her classes here until the next one she activates
-- collects them as a `campaign` Allowance Adjustment. Additive only: no
-- existing table changes and nothing is backfilled.

-- CreateTable
CREATE TABLE "booking"."owed_campaign_classes" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "classes" SMALLINT NOT NULL,
    "campaign_name" TEXT NOT NULL,
    "author_account_id" UUID NOT NULL,
    "correlation_id" UUID NOT NULL,
    "allowance_adjustment_id" UUID,
    "collected_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "owed_campaign_classes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "owed_campaign_classes_classes_check" CHECK ("classes" BETWEEN 1 AND 4),
    CONSTRAINT "owed_campaign_classes_name_check" CHECK (char_length("campaign_name") BETWEEN 1 AND 80),
    CONSTRAINT "owed_campaign_classes_collection_check" CHECK (
        ("allowance_adjustment_id" IS NULL) = ("collected_at" IS NULL))
);

-- CreateIndex
CREATE UNIQUE INDEX "owed_campaign_classes_allowance_adjustment_id_key" ON "booking"."owed_campaign_classes"("allowance_adjustment_id");

-- CreateIndex
CREATE INDEX "owed_campaign_classes_author_account_id_idx" ON "booking"."owed_campaign_classes"("author_account_id");

-- One live row per Client and campaign grant; a removed row must not block.
CREATE UNIQUE INDEX "owed_campaign_classes_one_per_campaign_key"
  ON "booking"."owed_campaign_classes" ("client_id", "correlation_id")
  WHERE "deleted_at" IS NULL;

-- What her next Subscription collects.
CREATE INDEX "owed_campaign_classes_uncollected_idx"
  ON "booking"."owed_campaign_classes" ("client_id", "created_at")
  WHERE "collected_at" IS NULL AND "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "booking"."owed_campaign_classes" ADD CONSTRAINT "owed_campaign_classes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."owed_campaign_classes" ADD CONSTRAINT "owed_campaign_classes_author_account_id_fkey" FOREIGN KEY ("author_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."owed_campaign_classes" ADD CONSTRAINT "owed_campaign_classes_allowance_adjustment_id_fkey" FOREIGN KEY ("allowance_adjustment_id") REFERENCES "booking"."allowance_adjustments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
