-- FIX-044 (owner, 2026-11-05; approved by the user the same day): the issued
-- invoice is uploaded on a confirmed Payment and reaches the Client in «Mis
-- facturas». Additive only: three enum values for the upload pipeline and
-- one table. Nothing existing changes; nothing is backfilled.

-- An invoice is an upload of its own purpose; only that purpose takes a PDF,
-- kept as is in one private `document` variant (width and height 0).
ALTER TYPE "system"."ImageAssetPurpose" ADD VALUE 'invoice';
ALTER TYPE "system"."ImageMediaType" ADD VALUE 'application/pdf';
ALTER TYPE "system"."ImageVariantKind" ADD VALUE 'document';

-- One current invoice per Payment; a replaced or removed one stays, hidden,
-- with who removed it and why (ADR-0086).
CREATE TABLE "booking"."payment_invoices" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "image_asset_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "uploaded_by_account_id" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL,
    "removed_at" TIMESTAMPTZ(3),
    "removed_by_account_id" UUID,
    "removal_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_invoices_file_name_length" CHECK (char_length("file_name") BETWEEN 1 AND 120),
    CONSTRAINT "payment_invoices_removal_complete" CHECK (
        ("removed_at" IS NULL AND "removed_by_account_id" IS NULL AND "removal_reason" IS NULL)
        OR ("removed_at" IS NOT NULL AND "removed_by_account_id" IS NOT NULL AND "removal_reason" IN ('replaced', 'removed'))
    )
);

CREATE UNIQUE INDEX "payment_invoices_image_asset_id_key" ON "booking"."payment_invoices"("image_asset_id");
CREATE INDEX "payment_invoices_payment_id_idx" ON "booking"."payment_invoices"("payment_id");
CREATE INDEX "payment_invoices_uploaded_by_account_id_idx" ON "booking"."payment_invoices"("uploaded_by_account_id");
CREATE INDEX "payment_invoices_removed_by_account_id_idx" ON "booking"."payment_invoices"("removed_by_account_id");
CREATE UNIQUE INDEX "payment_invoices_one_current_per_payment"
    ON "booking"."payment_invoices"("payment_id") WHERE "removed_at" IS NULL;

ALTER TABLE "booking"."payment_invoices" ADD CONSTRAINT "payment_invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "booking"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payment_invoices" ADD CONSTRAINT "payment_invoices_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payment_invoices" ADD CONSTRAINT "payment_invoices_uploaded_by_account_id_fkey" FOREIGN KEY ("uploaded_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payment_invoices" ADD CONSTRAINT "payment_invoices_removed_by_account_id_fkey" FOREIGN KEY ("removed_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
