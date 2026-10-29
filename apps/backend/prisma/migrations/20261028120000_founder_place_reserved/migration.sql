-- FIX-001: a founder place is reserved when the sale is priced and becomes
-- final at confirmation. Releasing a reservation sets deleted_at, so the
-- unique client must be partial (ADR-0086). The number stays unique across
-- removed rows and is never reused. Expand-only: active and lost stay.

ALTER TYPE "booking"."FounderMembershipStatus" ADD VALUE 'reserved';

ALTER TABLE "booking"."founder_memberships"
  ADD COLUMN "purchase_intent_id" UUID,
  ADD COLUMN "payment_id" UUID;

-- A live Client holds one place. A released row must not block the next.
DROP INDEX "booking"."founder_memberships_client_id_key";
CREATE UNIQUE INDEX "founder_memberships_client_id_key"
  ON "booking"."founder_memberships"("client_id")
  WHERE "deleted_at" IS NULL;

-- One open reservation per intent or payment. A released row must not block.
CREATE UNIQUE INDEX "founder_memberships_purchase_intent_id_key"
  ON "booking"."founder_memberships"("purchase_intent_id")
  WHERE "purchase_intent_id" IS NOT NULL AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX "founder_memberships_payment_id_key"
  ON "booking"."founder_memberships"("payment_id")
  WHERE "payment_id" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX "founder_memberships_purchase_intent_id_idx"
  ON "booking"."founder_memberships"("purchase_intent_id");

CREATE INDEX "founder_memberships_payment_id_idx"
  ON "booking"."founder_memberships"("payment_id");

-- The original amount check predates the founder discount and still requires
-- amount due to equal the list price minus Credit. The discount check is the
-- one that holds.
ALTER TABLE "booking"."purchase_intents"
  DROP CONSTRAINT "purchase_intents_amounts_check",
  ADD CONSTRAINT "purchase_intents_amounts_check" CHECK (
    "plan_price_centavos" > 0
    AND "credit_reserved_centavos" >= 0
    AND "amount_due_centavos" >= 0
    AND "credit_reserved_centavos" <= "plan_price_centavos"
  );

ALTER TABLE "booking"."founder_memberships"
  ADD CONSTRAINT "founder_memberships_purchase_intent_id_fkey"
  FOREIGN KEY ("purchase_intent_id") REFERENCES "booking"."purchase_intents"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."founder_memberships"
  ADD CONSTRAINT "founder_memberships_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "booking"."payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
