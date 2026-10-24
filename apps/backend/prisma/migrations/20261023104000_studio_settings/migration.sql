-- BKM-004 / ADR-0101: Studio Settings, the studio's configurable rules as one
-- versioned record. Each change appends a version; the highest one is in force.

-- CreateTable
CREATE TABLE "booking"."studio_settings_versions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "cancellation_window_minutes" SMALLINT NOT NULL,
    "minimum_bookings" SMALLINT NOT NULL,
    "minimum_bookings_check_lead_minutes" SMALLINT NOT NULL,
    "start_date_limit_days" SMALLINT NOT NULL,
    "founder_places" SMALLINT NOT NULL,
    "founder_discount_percent" SMALLINT NOT NULL,
    "founder_gap_days" SMALLINT NOT NULL,
    "guest_passes_per_client" SMALLINT NOT NULL,
    "invites_per_host_per_month" SMALLINT NOT NULL,
    "invite_reward_classes" SMALLINT NOT NULL,
    "tax_rate_percent" SMALLINT NOT NULL,
    "evaluation_price_centavos" INTEGER NOT NULL,
    "nutritionist_fee_centavos" INTEGER NOT NULL,
    "renewal_target_months_1_to_6_percent" SMALLINT NOT NULL,
    "renewal_target_months_7_to_12_percent" SMALLINT NOT NULL,
    "renewal_target_from_month_13_percent" SMALLINT NOT NULL,
    "opening_date" DATE,
    "created_by_account_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_settings_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_settings_versions_version_key" ON "booking"."studio_settings_versions"("version");

-- CreateIndex
CREATE INDEX "studio_settings_versions_created_by_account_id_idx" ON "booking"."studio_settings_versions"("created_by_account_id");

-- AddForeignKey
ALTER TABLE "booking"."studio_settings_versions" ADD CONSTRAINT "studio_settings_versions_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Versions count up from 1; every version after the seed names its author.
ALTER TABLE "booking"."studio_settings_versions" ADD CONSTRAINT "studio_settings_versions_version_positive" CHECK ("version" >= 1);
ALTER TABLE "booking"."studio_settings_versions" ADD CONSTRAINT "studio_settings_versions_author" CHECK ("version" = 1 OR "created_by_account_id" IS NOT NULL);

-- Durations, counts, and money are positive or zero; percents stay in 0–100.
ALTER TABLE "booking"."studio_settings_versions" ADD CONSTRAINT "studio_settings_versions_values" CHECK (
    "cancellation_window_minutes" > 0
    AND "minimum_bookings" BETWEEN 1 AND 20
    AND "minimum_bookings_check_lead_minutes" > 0
    AND "start_date_limit_days" >= 0
    AND "founder_places" >= 0
    AND "founder_discount_percent" BETWEEN 0 AND 100
    AND "founder_gap_days" >= 0
    AND "guest_passes_per_client" >= 0
    AND "invites_per_host_per_month" >= 0
    AND "invite_reward_classes" >= 0
    AND "tax_rate_percent" BETWEEN 0 AND 100
    AND "evaluation_price_centavos" >= 0
    AND "nutritionist_fee_centavos" >= 0
    AND "renewal_target_months_1_to_6_percent" BETWEEN 0 AND 100
    AND "renewal_target_months_7_to_12_percent" BETWEEN 0 AND 100
    AND "renewal_target_from_month_13_percent" BETWEEN 0 AND 100
);

-- A version is history: it is never changed or removed (ADR-0086, ADR-0101).
CREATE FUNCTION "booking"."reject_studio_settings_version_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'studio settings versions are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "studio_settings_versions_reject_update_or_delete"
    BEFORE UPDATE OR DELETE ON "booking"."studio_settings_versions"
    FOR EACH ROW EXECUTE FUNCTION "booking"."reject_studio_settings_version_mutation"();

CREATE TRIGGER "studio_settings_versions_reject_truncate"
    BEFORE TRUNCATE ON "booking"."studio_settings_versions"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_studio_settings_version_mutation"();

-- Version 1: the rules in force today (decisiones-emma-pilates.md): a 2.5-hour
-- Cancellation Window, 2 Minimum Bookings checked 3 hours before, Start Dates
-- up to 14 days ahead, 40 Founder places at 15 % lost after a 7-day gap, one
-- Guest Pass per Client, one invite a month, +1 class when a guest buys, 16 %
-- tax, Bs 70 per Paid Evaluation, Bs 50 to the Nutritionist, renewal targets
-- 80/85/90 %, and no Opening Date yet.
INSERT INTO "booking"."studio_settings_versions" (
    "id", "version", "cancellation_window_minutes", "minimum_bookings",
    "minimum_bookings_check_lead_minutes", "start_date_limit_days",
    "founder_places", "founder_discount_percent", "founder_gap_days",
    "guest_passes_per_client", "invites_per_host_per_month",
    "invite_reward_classes", "tax_rate_percent", "evaluation_price_centavos",
    "nutritionist_fee_centavos", "renewal_target_months_1_to_6_percent",
    "renewal_target_months_7_to_12_percent",
    "renewal_target_from_month_13_percent", "opening_date"
) VALUES (
    gen_random_uuid(), 1, 150, 2, 180, 14, 40, 15, 7, 1, 1, 1, 16, 7000, 5000,
    80, 85, 90, NULL
);
