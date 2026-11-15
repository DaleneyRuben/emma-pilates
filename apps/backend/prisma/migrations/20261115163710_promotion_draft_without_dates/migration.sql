-- Finding 82 (FIX-059, approved by the owner on 2026-11-15): a draft
-- Promotion may be saved before its display window is chosen. Additive: no
-- row changes, every existing Promotion keeps both dates.

-- AlterTable
ALTER TABLE "booking"."promotions" ALTER COLUMN "display_starts_on" DROP NOT NULL,
ALTER COLUMN "display_ends_on" DROP NOT NULL;

-- The window is compared only once both ends exist.
ALTER TABLE "booking"."promotions" DROP CONSTRAINT "promotions_values_check",
  ADD CONSTRAINT "promotions_values_check" CHECK (
    length(btrim(headline)) > 0 AND length(btrim(description)) > 0
    AND (display_starts_on IS NULL OR display_ends_on IS NULL
         OR display_ends_on >= display_starts_on)
    AND display_order >= 0
  );

-- A published Promotion still has an image, is live, and has both dates.
ALTER TABLE "booking"."promotions" DROP CONSTRAINT "promotions_publication_check",
  ADD CONSTRAINT "promotions_publication_check" CHECK (
    published_at IS NULL OR (
      image_asset_id IS NOT NULL AND archived_at IS NULL
      AND display_starts_on IS NOT NULL AND display_ends_on IS NOT NULL
    )
  );
