-- FIX-044, part of the migration the user approved on 2026-11-05: a PDF
-- invoice has no pixel size, so its verified width and height and its
-- `document` variant's are 0. The three checks that demanded a positive size
-- now allow 0 for a PDF only; every image keeps its rule. A separate
-- migration because a new enum value cannot be used in the transaction that
-- adds it (20261105200000).

ALTER TABLE "system"."image_assets"
    DROP CONSTRAINT "image_assets_values_check",
    ADD CONSTRAINT "image_assets_values_check" CHECK (
        "declared_byte_size" > 0
        AND octet_length("declared_checksum") = 32
        AND ("verified_checksum" IS NULL OR octet_length("verified_checksum") = 32)
        AND ("verified_byte_size" IS NULL OR "verified_byte_size" > 0)
        AND (
            ("verified_width" IS NULL AND "verified_height" IS NULL)
            OR ("verified_width" > 0 AND "verified_height" > 0)
            OR ("verified_media_type" = 'application/pdf' AND "verified_width" = 0 AND "verified_height" = 0)
        )
    ),
    DROP CONSTRAINT "image_assets_verified_metadata_check",
    ADD CONSTRAINT "image_assets_verified_metadata_check" CHECK (
        ("verified_media_type" IS NULL AND "verified_byte_size" IS NULL AND "verified_checksum" IS NULL AND "verified_width" IS NULL AND "verified_height" IS NULL)
        OR (
            "verified_media_type" IS NOT NULL AND "verified_byte_size" > 0 AND "verified_checksum" IS NOT NULL
            AND (
                ("verified_width" > 0 AND "verified_height" > 0)
                OR ("verified_media_type" = 'application/pdf' AND "verified_width" = 0 AND "verified_height" = 0)
            )
        )
    );

ALTER TABLE "system"."image_variants"
    DROP CONSTRAINT "image_variants_values_check",
    ADD CONSTRAINT "image_variants_values_check" CHECK (
        "byte_size" > 0
        AND (
            ("width" > 0 AND "height" > 0)
            OR ("media_type" = 'application/pdf' AND "width" = 0 AND "height" = 0)
        )
    );
