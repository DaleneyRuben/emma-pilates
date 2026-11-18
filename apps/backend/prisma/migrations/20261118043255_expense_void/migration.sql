-- Finding 104 (owner, 2026-11-18): «eliminar» an Expense voids it, never a
-- DELETE (ADR-0086). Who and when go together; the reason is optional.
ALTER TABLE "back_office"."expenses" ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided_at" TIMESTAMPTZ(3),
ADD COLUMN     "voided_by_account_id" UUID;

-- CreateIndex
CREATE INDEX "expenses_voided_by_account_id_idx" ON "back_office"."expenses"("voided_by_account_id");

-- AddForeignKey
ALTER TABLE "back_office"."expenses" ADD CONSTRAINT "expenses_voided_by_account_id_fkey" FOREIGN KEY ("voided_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "back_office"."expenses" ADD CONSTRAINT "expenses_void_complete_check" CHECK (
  ("voided_at" IS NULL) = ("voided_by_account_id" IS NULL)
  AND ("void_reason" IS NULL
    OR ("voided_at" IS NOT NULL
      AND char_length(btrim("void_reason")) BETWEEN 1 AND 300))
);
