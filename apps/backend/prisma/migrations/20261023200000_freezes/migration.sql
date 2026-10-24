-- BKM-012, booking ADR-0010: a Freeze is one request per Subscription.
-- A refused request still counts. Soft delete only (ADR-0086).

CREATE TYPE "booking"."FreezeState" AS ENUM ('requested', 'approved', 'refused');

CREATE TABLE "booking"."freezes" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "state" "booking"."FreezeState" NOT NULL DEFAULT 'requested',
    "decided_by_account_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "audit_record_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "freezes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "freezes_dates_check" CHECK ("ends_on" >= "starts_on"),
    CONSTRAINT "freezes_decision_check" CHECK (
      ("state" = 'requested' AND "decided_by_account_id" IS NULL AND "decided_at" IS NULL)
      OR ("state" <> 'requested' AND "decided_by_account_id" IS NOT NULL AND "decided_at" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "freezes_subscription_id_key" ON "booking"."freezes"("subscription_id");
CREATE INDEX "freezes_client_id_state_idx" ON "booking"."freezes"("client_id", "state");
CREATE INDEX "freezes_decided_by_account_id_idx" ON "booking"."freezes"("decided_by_account_id");

ALTER TABLE "booking"."freezes" ADD CONSTRAINT "freezes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "booking"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."freezes" ADD CONSTRAINT "freezes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."freezes" ADD CONSTRAINT "freezes_decided_by_account_id_fkey" FOREIGN KEY ("decided_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
