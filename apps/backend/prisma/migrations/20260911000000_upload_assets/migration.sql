CREATE TYPE "system"."ImageMediaType" AS ENUM ('image/jpeg', 'image/png', 'image/webp');
CREATE TYPE "system"."ImageVariantKind" AS ENUM ('thumbnail', 'display', 'readable', 'promotion_480', 'promotion_960', 'promotion_1440');
CREATE TYPE "system"."ImageVariantVisibility" AS ENUM ('private', 'public');

ALTER TABLE "system"."image_assets"
  ALTER COLUMN "declared_media_type" TYPE "system"."ImageMediaType" USING "declared_media_type"::"system"."ImageMediaType",
  ALTER COLUMN "verified_media_type" TYPE "system"."ImageMediaType" USING "verified_media_type"::"system"."ImageMediaType",
  ADD COLUMN "processing_started_at" TIMESTAMPTZ(3),
  ADD COLUMN "failed_at" TIMESTAMPTZ(3),
  ADD COLUMN "failure_code" TEXT,
  ADD COLUMN "deletion_due_at" TIMESTAMPTZ(3),
  ADD COLUMN "delete_requested_at" TIMESTAMPTZ(3);

CREATE TABLE "system"."image_variants" (
  "id" UUID NOT NULL,
  "image_asset_id" UUID NOT NULL,
  "kind" "system"."ImageVariantKind" NOT NULL,
  "visibility" "system"."ImageVariantVisibility" NOT NULL,
  "delivery_version" UUID NOT NULL,
  "storage_key" TEXT NOT NULL,
  "media_type" "system"."ImageMediaType" NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "delete_requested_at" TIMESTAMPTZ(3),
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "image_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "image_variants_values_check" CHECK ("byte_size" > 0 AND "width" > 0 AND "height" > 0)
);

CREATE UNIQUE INDEX "image_variants_storage_key_key" ON "system"."image_variants"("storage_key");
CREATE UNIQUE INDEX "image_variants_image_asset_id_kind_visibility_delivery_version_key" ON "system"."image_variants"("image_asset_id", "kind", "visibility", "delivery_version");
CREATE INDEX "image_variants_image_asset_id_visibility_delete_requested_at_idx" ON "system"."image_variants"("image_asset_id", "visibility", "delete_requested_at");
CREATE UNIQUE INDEX "image_variants_one_live_private_kind_key" ON "system"."image_variants"("image_asset_id", "kind") WHERE "visibility" = 'private' AND "delete_requested_at" IS NULL;
CREATE UNIQUE INDEX "image_variants_one_live_public_kind_key" ON "system"."image_variants"("image_asset_id", "kind") WHERE "visibility" = 'public' AND "delete_requested_at" IS NULL;

ALTER TABLE "system"."image_assets"
  ADD CONSTRAINT "image_assets_values_check" CHECK (
    "declared_byte_size" > 0
    AND octet_length("declared_checksum") = 32
    AND ("verified_checksum" IS NULL OR octet_length("verified_checksum") = 32)
    AND ("verified_byte_size" IS NULL OR "verified_byte_size" > 0)
    AND (("verified_width" IS NULL AND "verified_height" IS NULL) OR ("verified_width" > 0 AND "verified_height" > 0))
  );

ALTER TABLE "system"."image_variants"
  ADD CONSTRAINT "image_variants_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
