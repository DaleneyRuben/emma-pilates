-- BKM-011: Acquisition Channel and Referral Codes (Booking ADR-0009).

-- CreateEnum
CREATE TYPE "booking"."AcquisitionChannel" AS ENUM ('instagram', 'tiktok', 'facebook', 'google', 'friend', 'trainer', 'walk_in', 'other', 'unknown');

-- AlterTable
ALTER TABLE "booking"."staff_members" ADD COLUMN     "referral_code" TEXT;

-- A Trainer's personal code is unique among live Staff Members (ADR-0086).
-- Client codes start with REF-, which a personal code may not, so the two
-- never collide.
CREATE UNIQUE INDEX "staff_members_referral_code_live_key" ON "booking"."staff_members"("referral_code") WHERE "referral_code" IS NOT NULL AND "deleted_at" IS NULL;

-- CreateTable
CREATE TABLE "booking"."client_acquisitions" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "declared_channel" "booking"."AcquisitionChannel" NOT NULL,
    "channel" "booking"."AcquisitionChannel" NOT NULL,
    "referral_code" TEXT,
    "referrer_client_id" UUID,
    "referrer_staff_member_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "client_acquisitions_pkey" PRIMARY KEY ("id"),
    -- A code names exactly one referrer, and no referrer without a code.
    CONSTRAINT "client_acquisitions_referrer_check" CHECK (
        num_nonnulls("referrer_client_id", "referrer_staff_member_id")
            = CASE WHEN "referral_code" IS NULL THEN 0 ELSE 1 END
    ),
    -- The code wins: a Client's code means `friend`, a Trainer's `trainer`.
    CONSTRAINT "client_acquisitions_code_wins_check" CHECK (
        ("referrer_client_id" IS NULL OR "channel" = 'friend')
        AND ("referrer_staff_member_id" IS NULL OR "channel" = 'trainer')
    ),
    CONSTRAINT "client_acquisitions_no_self_referral_check" CHECK (
        "referrer_client_id" IS NULL OR "referrer_client_id" <> "client_id"
    )
);

-- One live attribution per Client (ADR-0086).
CREATE UNIQUE INDEX "client_acquisitions_client_live_key" ON "booking"."client_acquisitions"("client_id") WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "client_acquisitions_referrer_client_id_idx" ON "booking"."client_acquisitions"("referrer_client_id");

-- CreateIndex
CREATE INDEX "client_acquisitions_referrer_staff_member_id_idx" ON "booking"."client_acquisitions"("referrer_staff_member_id");

-- AddForeignKey
ALTER TABLE "booking"."client_acquisitions" ADD CONSTRAINT "client_acquisitions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."client_acquisitions" ADD CONSTRAINT "client_acquisitions_referrer_client_id_fkey" FOREIGN KEY ("referrer_client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."client_acquisitions" ADD CONSTRAINT "client_acquisitions_referrer_staff_member_id_fkey" FOREIGN KEY ("referrer_staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing Clients: a Referral made at registration means a friend's code;
-- everyone else registered before the question existed.
INSERT INTO "booking"."client_acquisitions" ("id", "client_id", "declared_channel", "channel", "referral_code", "referrer_client_id", "updated_at")
SELECT gen_random_uuid(), c."id",
       CASE WHEN r."id" IS NULL THEN 'unknown' ELSE 'friend' END::"booking"."AcquisitionChannel",
       CASE WHEN r."id" IS NULL THEN 'unknown' ELSE 'friend' END::"booking"."AcquisitionChannel",
       referrer."referral_code", r."referrer_client_id", CURRENT_TIMESTAMP
FROM "booking"."clients" c
LEFT JOIN "booking"."referrals" r ON r."referred_client_id" = c."id"
LEFT JOIN "booking"."clients" referrer ON referrer."id" = r."referrer_client_id"
WHERE c."deleted_at" IS NULL;
