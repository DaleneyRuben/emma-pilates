-- CreateTable
CREATE TABLE "back_office"."cash_closes" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "expected_centavos" INTEGER NOT NULL,
    "cash_payment_count" INTEGER NOT NULL,
    "counted_centavos" INTEGER NOT NULL,
    "note" TEXT,
    "closed_by_account_id" UUID NOT NULL,
    "closed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_closes_business_date_idx" ON "back_office"."cash_closes"("business_date");

-- CreateIndex
CREATE INDEX "cash_closes_closed_by_account_id_idx" ON "back_office"."cash_closes"("closed_by_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_closes_branch_id_business_date_key" ON "back_office"."cash_closes"("branch_id", "business_date");

-- AddForeignKey
ALTER TABLE "back_office"."cash_closes" ADD CONSTRAINT "cash_closes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."cash_closes" ADD CONSTRAINT "cash_closes_closed_by_account_id_fkey" FOREIGN KEY ("closed_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL invariants Prisma cannot express (BKO-003). The unique index
-- above is the one-close-a-day rule: a second close of the same Branch and
-- day fails with 23505 whatever the application checked first.

ALTER TABLE "back_office"."cash_closes"
  ADD CONSTRAINT "cash_closes_values_check" CHECK (
    "expected_centavos" >= 0
    AND "cash_payment_count" >= 0
    AND "counted_centavos" >= 0
    AND ("note" IS NULL OR (length(btrim("note")) > 0 AND char_length("note") <= 500))
  );

-- A Cash Close is history: a sale voided later shows as an adjustment
-- computed from the Payments, never as an edit of the close.
CREATE TRIGGER "cash_closes_immutable"
    BEFORE UPDATE OR DELETE ON "back_office"."cash_closes"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_movement_change"();
