-- BKM-013: first-90-days lifecycle messages and contact alerts.

-- CreateEnum
CREATE TYPE "booking"."LifecycleMilestone" AS ENUM ('day_2', 'week_1', 'day_30', 'day_90');

-- CreateEnum
CREATE TYPE "booking"."ContactAlertReason" AS ENUM ('no_booking_7_days', 'fewer_than_2_classes_by_day_15', 'fewer_than_4_classes_in_first_30_days');

-- CreateTable
CREATE TABLE "booking"."lifecycle_messages" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "milestone" "booking"."LifecycleMilestone" NOT NULL,
    "sent_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "lifecycle_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."contact_alerts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "reason" "booking"."ContactAlertReason" NOT NULL,
    "opened_at" TIMESTAMPTZ(3) NOT NULL,
    "contacted_at" TIMESTAMPTZ(3),
    "contacted_by_account_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "contact_alerts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contact_alerts_contacted_check" CHECK (
        ("contacted_at" IS NULL AND "contacted_by_account_id" IS NULL)
        OR ("contacted_at" IS NOT NULL AND "contacted_by_account_id" IS NOT NULL AND "contacted_at" >= "opened_at")
    )
);

-- CreateIndex
CREATE INDEX "lifecycle_messages_client_id_idx" ON "booking"."lifecycle_messages"("client_id");

-- One send per Client per milestone among live rows (ADR-0086).
CREATE UNIQUE INDEX "lifecycle_messages_client_milestone_live_key" ON "booking"."lifecycle_messages"("client_id", "milestone") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "contact_alerts_client_id_idx" ON "booking"."contact_alerts"("client_id");

-- CreateIndex
CREATE INDEX "contact_alerts_contacted_by_account_id_idx" ON "booking"."contact_alerts"("contacted_by_account_id");

-- One open stretch per Client per reason among live rows (ADR-0086).
CREATE UNIQUE INDEX "contact_alerts_client_reason_open_key" ON "booking"."contact_alerts"("client_id", "reason") WHERE "deleted_at" IS NULL AND "contacted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "booking"."lifecycle_messages" ADD CONSTRAINT "lifecycle_messages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."contact_alerts" ADD CONSTRAINT "contact_alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."contact_alerts" ADD CONSTRAINT "contact_alerts_contacted_by_account_id_fkey" FOREIGN KEY ("contacted_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
