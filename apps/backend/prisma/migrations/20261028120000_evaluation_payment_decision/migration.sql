-- An Administrator may reject an Evaluation transfer. A worker expiry still
-- rejects one with no Account. Both write decided_at.
ALTER TYPE "booking"."EvaluationCancellationCause" ADD VALUE 'payment_rejected';

ALTER TABLE "booking"."payments"
  ADD COLUMN "receipt_image_asset_id" UUID;

CREATE UNIQUE INDEX "payments_receipt_image_asset_id_key"
  ON "booking"."payments"("receipt_image_asset_id");

ALTER TABLE "booking"."payments"
  ADD CONSTRAINT "payments_receipt_image_asset_id_fkey"
  FOREIGN KEY ("receipt_image_asset_id") REFERENCES "system"."image_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."payments"
  DROP CONSTRAINT "payments_state_fields_check",
  ADD CONSTRAINT "payments_state_fields_check" CHECK (
    ("state" = 'pending'
      AND "decided_by_account_id" IS NULL
      AND "decided_at" IS NULL
      AND "rejection_reason" IS NULL)
    OR ("state" = 'confirmed'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NULL
      AND "decided_at" >= "submitted_at")
    OR ("state" = 'rejected'
      AND "rejection_reason" IS NOT NULL
      AND char_length(btrim("rejection_reason")) BETWEEN 1 AND 300
      AND "rejection_reason" = btrim("rejection_reason")
      AND "decided_at" IS NOT NULL
      AND "decided_at" >= "submitted_at"
      AND (
        "kind" = 'evaluation'
        OR "decided_by_account_id" IS NOT NULL
      ))
    OR ("state" = 'voided'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NULL
      AND "decided_at" >= "submitted_at"
      AND "voided_at" >= "decided_at")
  );
