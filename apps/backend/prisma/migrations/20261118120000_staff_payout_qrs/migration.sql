-- FIX-072 (walkthrough finding 106): a staff member's bank QR for her salary
-- and its last valid day, approved by the owner on 2026-11-18. Additive only:
-- no existing row changes and nothing is deleted.

-- AlterEnum
ALTER TYPE "system"."ImageAssetPurpose" ADD VALUE 'payout_qr';

-- CreateTable
CREATE TABLE "back_office"."staff_payout_qrs" (
    "id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "image_asset_id" UUID NOT NULL,
    "valid_until" DATE NOT NULL,
    "uploaded_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replaced_at" TIMESTAMPTZ(3),

    CONSTRAINT "staff_payout_qrs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_payout_qrs_image_asset_id_key" ON "back_office"."staff_payout_qrs"("image_asset_id");

-- CreateIndex
CREATE INDEX "staff_payout_qrs_staff_member_id_idx" ON "back_office"."staff_payout_qrs"("staff_member_id");

-- CreateIndex
CREATE INDEX "staff_payout_qrs_uploaded_by_account_id_idx" ON "back_office"."staff_payout_qrs"("uploaded_by_account_id");

-- At most one current QR per person; replaced ones stay as history.
CREATE UNIQUE INDEX "staff_payout_qrs_current_key" ON "back_office"."staff_payout_qrs"("staff_member_id") WHERE "replaced_at" IS NULL;

-- The reminder sweep reads current QRs by their last valid day.
CREATE INDEX "staff_payout_qrs_current_valid_until_idx" ON "back_office"."staff_payout_qrs"("valid_until") WHERE "replaced_at" IS NULL;

-- AddForeignKey
ALTER TABLE "back_office"."staff_payout_qrs" ADD CONSTRAINT "staff_payout_qrs_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."staff_payout_qrs" ADD CONSTRAINT "staff_payout_qrs_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."staff_payout_qrs" ADD CONSTRAINT "staff_payout_qrs_uploaded_by_account_id_fkey" FOREIGN KEY ("uploaded_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
