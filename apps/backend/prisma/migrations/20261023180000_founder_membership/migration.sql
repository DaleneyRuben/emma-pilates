-- BKM-010, booking ADR-0008: the founder discount is stored on the sale
-- beside the list price, and the membership is one row per Client. The
-- number is unique for good, so a lost membership never frees its place.

CREATE TYPE "booking"."FounderMembershipStatus" AS ENUM ('active', 'lost');

ALTER TABLE "booking"."purchase_intents"
  ADD COLUMN "discount_centavos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discount_reason" TEXT;

ALTER TABLE "booking"."payments"
  ADD COLUMN "discount_centavos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discount_reason" TEXT;

-- The list price, the discount, and the Credit together make the amount due.
ALTER TABLE "booking"."payments"
  DROP CONSTRAINT "payments_amounts_check",
  ADD CONSTRAINT "payments_amounts_check" CHECK (
    ("plan_price_centavos" > 0
      OR ("method" = 'courtesy' AND "plan_price_centavos" = 0))
    AND "credit_applied_centavos" >= 0
    AND "discount_centavos" >= 0
    AND "amount_due_centavos" >= 0
    AND "credit_applied_centavos" + "discount_centavos" <= "plan_price_centavos"
    AND "amount_due_centavos" = "plan_price_centavos" - "discount_centavos" - "credit_applied_centavos"
    AND ("discount_reason" IS NULL OR "discount_centavos" > 0)
  );

ALTER TABLE "booking"."purchase_intents"
  ADD CONSTRAINT "purchase_intents_discount_check" CHECK (
    "discount_centavos" >= 0
    AND "credit_reserved_centavos" + "discount_centavos" <= "plan_price_centavos"
    AND "amount_due_centavos" = "plan_price_centavos" - "discount_centavos" - "credit_reserved_centavos"
    AND ("discount_reason" IS NULL OR "discount_centavos" > 0)
  );

CREATE TABLE "booking"."founder_memberships" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "number" SMALLINT NOT NULL,
    "since" TIMESTAMPTZ(3) NOT NULL,
    "status" "booking"."FounderMembershipStatus" NOT NULL DEFAULT 'active',
    "reason" TEXT,
    "lost_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "founder_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "founder_memberships_client_id_key" ON "booking"."founder_memberships"("client_id");
CREATE UNIQUE INDEX "founder_memberships_number_key" ON "booking"."founder_memberships"("number");
CREATE INDEX "founder_memberships_status_number_idx" ON "booking"."founder_memberships"("status", "number");

ALTER TABLE "booking"."founder_memberships" ADD CONSTRAINT "founder_memberships_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
