-- BKO-008: an optional photo of the transfer on a Salary Payment, approved by
-- the owner on 2026-11-02. Existing rows keep NULL; nothing is deleted.

-- AlterTable
ALTER TABLE "back_office"."salary_payments" ADD COLUMN     "receipt_image_asset_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "salary_payments_receipt_image_asset_id_key" ON "back_office"."salary_payments"("receipt_image_asset_id");

-- AddForeignKey
ALTER TABLE "back_office"."salary_payments" ADD CONSTRAINT "salary_payments_receipt_image_asset_id_fkey" FOREIGN KEY ("receipt_image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
