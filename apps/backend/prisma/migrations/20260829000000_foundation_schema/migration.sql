-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "booking";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "system";

-- CreateEnum
CREATE TYPE "booking"."StaffRole" AS ENUM ('trainer', 'nutritionist', 'assistant', 'administrator');

-- CreateEnum
CREATE TYPE "system"."AuthenticationTokenPurpose" AS ENUM ('verification', 'activation', 'password_recovery');

-- CreateEnum
CREATE TYPE "system"."AuthenticationSessionSurface" AS ENUM ('mobile', 'admin_web');

-- CreateEnum
CREATE TYPE "system"."AuthenticationSessionRevocationReason" AS ENUM ('logout', 'logout_other_devices', 'password_changed', 'password_recovered', 'account_disabled', 'security_action');

-- CreateEnum
CREATE TYPE "system"."AuthenticationThrottlePurpose" AS ENUM ('login', 'verification', 'activation', 'password_recovery');

-- CreateEnum
CREATE TYPE "system"."AuthenticationThrottleEventKind" AS ENUM ('failed_credential_check', 'message_issued');

-- CreateEnum
CREATE TYPE "system"."EmailSuppressionReason" AS ENUM ('hard_bounce', 'complaint');

-- CreateEnum
CREATE TYPE "system"."AuditOutcome" AS ENUM ('succeeded', 'failed');

-- CreateEnum
CREATE TYPE "system"."AuditActorKind" AS ENUM ('account', 'system', 'worker', 'bootstrap');

-- CreateEnum
CREATE TYPE "system"."NotificationCategory" AS ENUM ('booking_schedule', 'reminder', 'subscription_payment', 'announcement');

-- CreateEnum
CREATE TYPE "system"."AccountDevicePlatform" AS ENUM ('ios', 'android');

-- CreateEnum
CREATE TYPE "system"."AccountDeviceDeactivationReason" AS ENUM ('logout', 'account_disabled', 'device_not_registered', 'permission_revoked', 'account_changed', 'token_replaced');

-- CreateEnum
CREATE TYPE "system"."NotificationDeliveryState" AS ENUM ('queued', 'submitted', 'delivered', 'failed', 'discarded');

-- CreateEnum
CREATE TYPE "system"."ImageAssetPurpose" AS ENUM ('profile_photo', 'transfer_receipt', 'promotion');

-- CreateEnum
CREATE TYPE "system"."ImageAssetState" AS ENUM ('pending', 'processing', 'ready', 'attached', 'failed', 'deleted');

-- CreateTable
CREATE TABLE "booking"."clients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "profile_image_asset_id" UUID,
    "referral_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."staff_members" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "booking"."StaffRole" NOT NULL,
    "profile_image_asset_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."branches" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."staff_branch_assignments" (
    "staff_member_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_branch_assignments_pkey" PRIMARY KEY ("staff_member_id","branch_id")
);

-- CreateTable
CREATE TABLE "system"."accounts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "password_changed_at" TIMESTAMPTZ(3),
    "email_verified_at" TIMESTAMPTZ(3),
    "activated_at" TIMESTAMPTZ(3),
    "disabled_at" TIMESTAMPTZ(3),
    "pending_expires_at" TIMESTAMPTZ(3),
    "client_id" UUID,
    "staff_member_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."authentication_tokens" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "purpose" "system"."AuthenticationTokenPurpose" NOT NULL,
    "token_digest" BYTEA NOT NULL,
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "invalidated_at" TIMESTAMPTZ(3),

    CONSTRAINT "authentication_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."authentication_sessions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "account_device_id" UUID,
    "surface" "system"."AuthenticationSessionSurface" NOT NULL,
    "credential_digest" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_meaningful_activity_at" TIMESTAMPTZ(3) NOT NULL,
    "idle_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" "system"."AuthenticationSessionRevocationReason",

    CONSTRAINT "authentication_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."authentication_throttle_events" (
    "id" UUID NOT NULL,
    "purpose" "system"."AuthenticationThrottlePurpose" NOT NULL,
    "event_kind" "system"."AuthenticationThrottleEventKind" NOT NULL,
    "recipient_digest" BYTEA,
    "login_lane_digest" BYTEA,
    "client_digest" BYTEA,
    "network_digest" BYTEA,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "authentication_throttle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."email_suppressions" (
    "id" UUID NOT NULL,
    "email_digest" BYTEA NOT NULL,
    "reason" "system"."EmailSuppressionReason" NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "provider_occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "suppressed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    "resolved_by_account_id" UUID,
    "resolution_reason" TEXT,
    "resolution_note" TEXT,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."audit_records" (
    "id" UUID NOT NULL,
    "action_code" TEXT NOT NULL,
    "outcome" "system"."AuditOutcome" NOT NULL,
    "actor_kind" "system"."AuditActorKind" NOT NULL,
    "actor_account_id" UUID,
    "actor_role" "booking"."StaffRole",
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "branch_id" UUID,
    "correlation_id" UUID NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."idempotency_records" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "command" TEXT NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "request_hash" BYTEA NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."notifications" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "category" "system"."NotificationCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "business_event_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "destination_type" TEXT,
    "destination_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."account_devices" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "installation_id_digest" BYTEA NOT NULL,
    "expo_push_token" TEXT,
    "platform" "system"."AccountDevicePlatform" NOT NULL,
    "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMPTZ(3),
    "deactivation_reason" "system"."AccountDeviceDeactivationReason",

    CONSTRAINT "account_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "account_device_id" UUID NOT NULL,
    "state" "system"."NotificationDeliveryState" NOT NULL DEFAULT 'queued',
    "provider_ticket_id" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(3),
    "receipt_checked_at" TIMESTAMPTZ(3),
    "failure_category" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."image_assets" (
    "id" UUID NOT NULL,
    "owner_account_id" UUID NOT NULL,
    "purpose" "system"."ImageAssetPurpose" NOT NULL,
    "state" "system"."ImageAssetState" NOT NULL DEFAULT 'pending',
    "pending_object_key" TEXT NOT NULL,
    "declared_media_type" TEXT NOT NULL,
    "declared_byte_size" INTEGER NOT NULL,
    "declared_checksum" BYTEA NOT NULL,
    "verified_media_type" TEXT,
    "verified_byte_size" INTEGER,
    "verified_checksum" BYTEA,
    "verified_width" INTEGER,
    "verified_height" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "finalized_at" TIMESTAMPTZ(3),
    "attached_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_profile_image_asset_id_key" ON "booking"."clients"("profile_image_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_referral_code_key" ON "booking"."clients"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_profile_image_asset_id_key" ON "booking"."staff_members"("profile_image_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "system"."accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_client_id_key" ON "system"."accounts"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_staff_member_id_key" ON "system"."accounts"("staff_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "authentication_tokens_token_digest_key" ON "system"."authentication_tokens"("token_digest");

-- CreateIndex
CREATE INDEX "authentication_tokens_account_id_purpose_idx" ON "system"."authentication_tokens"("account_id", "purpose");

-- CreateIndex
CREATE INDEX "authentication_tokens_expires_at_idx" ON "system"."authentication_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "authentication_sessions_credential_digest_key" ON "system"."authentication_sessions"("credential_digest");

-- CreateIndex
CREATE INDEX "authentication_sessions_account_id_revoked_at_idx" ON "system"."authentication_sessions"("account_id", "revoked_at");

-- CreateIndex
CREATE INDEX "authentication_sessions_idle_expires_at_idx" ON "system"."authentication_sessions"("idle_expires_at");

-- CreateIndex
CREATE INDEX "authentication_sessions_absolute_expires_at_idx" ON "system"."authentication_sessions"("absolute_expires_at");

-- CreateIndex
CREATE INDEX "authentication_throttle_events_purpose_recipient_digest_occ_idx" ON "system"."authentication_throttle_events"("purpose", "recipient_digest", "occurred_at");

-- CreateIndex
CREATE INDEX "authentication_throttle_events_login_lane_digest_occurred_a_idx" ON "system"."authentication_throttle_events"("login_lane_digest", "occurred_at");

-- CreateIndex
CREATE INDEX "authentication_throttle_events_client_digest_occurred_at_idx" ON "system"."authentication_throttle_events"("client_digest", "occurred_at");

-- CreateIndex
CREATE INDEX "authentication_throttle_events_network_digest_occurred_at_idx" ON "system"."authentication_throttle_events"("network_digest", "occurred_at");

-- CreateIndex
CREATE INDEX "authentication_throttle_events_expires_at_idx" ON "system"."authentication_throttle_events"("expires_at");

-- CreateIndex
CREATE INDEX "email_suppressions_email_digest_idx" ON "system"."email_suppressions"("email_digest");

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_provider_provider_event_id_key" ON "system"."email_suppressions"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "audit_records_actor_account_id_occurred_at_idx" ON "system"."audit_records"("actor_account_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_records_target_type_target_id_occurred_at_idx" ON "system"."audit_records"("target_type", "target_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_records_branch_id_occurred_at_idx" ON "system"."audit_records"("branch_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_records_correlation_id_idx" ON "system"."audit_records"("correlation_id");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "system"."idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_account_id_command_idempotency_key_key" ON "system"."idempotency_records"("account_id", "command", "idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_account_id_read_at_created_at_idx" ON "system"."notifications"("account_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_account_id_business_event_key_key" ON "system"."notifications"("account_id", "business_event_key");

-- CreateIndex
CREATE INDEX "account_devices_account_id_deactivated_at_idx" ON "system"."account_devices"("account_id", "deactivated_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_provider_ticket_id_key" ON "system"."notification_deliveries"("provider_ticket_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_state_created_at_idx" ON "system"."notification_deliveries"("state", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_account_device_id_state_idx" ON "system"."notification_deliveries"("account_device_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notification_id_account_device_id_key" ON "system"."notification_deliveries"("notification_id", "account_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "image_assets_pending_object_key_key" ON "system"."image_assets"("pending_object_key");

-- CreateIndex
CREATE INDEX "image_assets_owner_account_id_state_idx" ON "system"."image_assets"("owner_account_id", "state");

-- CreateIndex
CREATE INDEX "image_assets_state_expires_at_idx" ON "system"."image_assets"("state", "expires_at");

-- AddForeignKey
ALTER TABLE "booking"."clients" ADD CONSTRAINT "clients_profile_image_asset_id_fkey" FOREIGN KEY ("profile_image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."staff_members" ADD CONSTRAINT "staff_members_profile_image_asset_id_fkey" FOREIGN KEY ("profile_image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."staff_branch_assignments" ADD CONSTRAINT "staff_branch_assignments_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."staff_branch_assignments" ADD CONSTRAINT "staff_branch_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."accounts" ADD CONSTRAINT "accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."accounts" ADD CONSTRAINT "accounts_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."authentication_tokens" ADD CONSTRAINT "authentication_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."authentication_sessions" ADD CONSTRAINT "authentication_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."authentication_sessions" ADD CONSTRAINT "authentication_sessions_account_device_id_fkey" FOREIGN KEY ("account_device_id") REFERENCES "system"."account_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."email_suppressions" ADD CONSTRAINT "email_suppressions_resolved_by_account_id_fkey" FOREIGN KEY ("resolved_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."audit_records" ADD CONSTRAINT "audit_records_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "system"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."audit_records" ADD CONSTRAINT "audit_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."idempotency_records" ADD CONSTRAINT "idempotency_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."notifications" ADD CONSTRAINT "notifications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."account_devices" ADD CONSTRAINT "account_devices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "system"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_account_device_id_fkey" FOREIGN KEY ("account_device_id") REFERENCES "system"."account_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."image_assets" ADD CONSTRAINT "image_assets_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Approved identity and lifecycle checks that Prisma cannot express.
ALTER TABLE "system"."accounts"
    ADD CONSTRAINT "accounts_exactly_one_domain_identity_check"
    CHECK (num_nonnulls("client_id", "staff_member_id") = 1),
    ADD CONSTRAINT "accounts_normalized_email_check"
    CHECK ("email" = lower(btrim("email")) AND "email" <> '');

ALTER TABLE "system"."authentication_tokens"
    ADD CONSTRAINT "authentication_tokens_valid_lifetime_check"
    CHECK (
        "expires_at" > "issued_at"
        AND ("used_at" IS NULL OR "used_at" >= "issued_at")
        AND ("invalidated_at" IS NULL OR "invalidated_at" >= "issued_at")
    );

ALTER TABLE "system"."authentication_sessions"
    ADD CONSTRAINT "authentication_sessions_valid_lifetime_check"
    CHECK (
        "last_meaningful_activity_at" >= "created_at"
        AND "idle_expires_at" > "last_meaningful_activity_at"
        AND "absolute_expires_at" > "created_at"
        AND "idle_expires_at" <= "absolute_expires_at"
    ),
    ADD CONSTRAINT "authentication_sessions_revocation_pair_check"
    CHECK (("revoked_at" IS NULL) = ("revocation_reason" IS NULL));

ALTER TABLE "system"."authentication_throttle_events"
    ADD CONSTRAINT "authentication_throttle_events_valid_window_check"
    CHECK ("expires_at" > "occurred_at"),
    ADD CONSTRAINT "authentication_throttle_events_has_digest_check"
    CHECK (num_nonnulls("recipient_digest", "login_lane_digest", "client_digest", "network_digest") > 0),
    ADD CONSTRAINT "authentication_throttle_events_kind_purpose_check"
    CHECK (
        ("event_kind" = 'failed_credential_check' AND "purpose" = 'login' AND "login_lane_digest" IS NOT NULL)
        OR
        ("event_kind" = 'message_issued' AND "purpose" <> 'login' AND "recipient_digest" IS NOT NULL)
    );

ALTER TABLE "system"."email_suppressions"
    ADD CONSTRAINT "email_suppressions_resolution_check"
    CHECK (
        ("resolved_at" IS NULL AND "resolved_by_account_id" IS NULL AND "resolution_reason" IS NULL AND "resolution_note" IS NULL)
        OR
        ("resolved_at" IS NOT NULL AND "resolved_by_account_id" IS NOT NULL AND "resolution_reason" IS NOT NULL)
    );

ALTER TABLE "system"."audit_records"
    ADD CONSTRAINT "audit_records_actor_check"
    CHECK (
        ("actor_kind" = 'account' AND "actor_account_id" IS NOT NULL)
        OR
        ("actor_kind" <> 'account' AND "actor_account_id" IS NULL AND "actor_role" IS NULL)
    );

ALTER TABLE "system"."idempotency_records"
    ADD CONSTRAINT "idempotency_records_status_check"
    CHECK ("response_status" BETWEEN 100 AND 599),
    ADD CONSTRAINT "idempotency_records_valid_lifetime_check"
    CHECK ("expires_at" > "created_at");

ALTER TABLE "system"."notifications"
    ADD CONSTRAINT "notifications_read_time_check"
    CHECK ("read_at" IS NULL OR "read_at" >= "created_at");

ALTER TABLE "system"."account_devices"
    ADD CONSTRAINT "account_devices_active_state_check"
    CHECK (
        ("deactivated_at" IS NULL AND "deactivation_reason" IS NULL AND "expo_push_token" IS NOT NULL)
        OR
        ("deactivated_at" IS NOT NULL AND "deactivation_reason" IS NOT NULL AND "expo_push_token" IS NULL)
    ),
    ADD CONSTRAINT "account_devices_timestamps_check"
    CHECK ("token_updated_at" >= "registered_at" AND "last_seen_at" >= "registered_at");

ALTER TABLE "system"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_attempt_count_check"
    CHECK ("attempt_count" >= 0),
    ADD CONSTRAINT "notification_deliveries_completion_check"
    CHECK (
        ("state" IN ('queued', 'submitted') AND "completed_at" IS NULL)
        OR
        ("state" IN ('delivered', 'failed', 'discarded') AND "completed_at" IS NOT NULL)
    ),
    ADD CONSTRAINT "notification_deliveries_provider_ticket_check"
    CHECK ("state" NOT IN ('submitted', 'delivered') OR "provider_ticket_id" IS NOT NULL);

ALTER TABLE "system"."image_assets"
    ADD CONSTRAINT "image_assets_declared_size_check"
    CHECK ("declared_byte_size" > 0),
    ADD CONSTRAINT "image_assets_verified_metadata_check"
    CHECK (
        ("verified_media_type" IS NULL AND "verified_byte_size" IS NULL AND "verified_checksum" IS NULL AND "verified_width" IS NULL AND "verified_height" IS NULL)
        OR
        ("verified_media_type" IS NOT NULL AND "verified_byte_size" > 0 AND "verified_checksum" IS NOT NULL AND "verified_width" > 0 AND "verified_height" > 0)
    ),
    ADD CONSTRAINT "image_assets_valid_lifetime_check"
    CHECK (
        "expires_at" > "created_at"
        AND ("finalized_at" IS NULL OR "finalized_at" >= "created_at")
        AND ("attached_at" IS NULL OR ("finalized_at" IS NOT NULL AND "attached_at" >= "finalized_at"))
        AND ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
    );

ALTER TABLE "booking"."clients"
    ADD CONSTRAINT "clients_name_check" CHECK (btrim("name") <> ''),
    ADD CONSTRAINT "clients_referral_code_check" CHECK (btrim("referral_code") <> '');

ALTER TABLE "booking"."staff_members"
    ADD CONSTRAINT "staff_members_name_check" CHECK (btrim("name") <> '');

ALTER TABLE "booking"."branches"
    ADD CONSTRAINT "branches_name_check" CHECK (btrim("name") <> ''),
    ADD CONSTRAINT "branches_address_check" CHECK (btrim("address") <> '');

-- Partial uniqueness for records whose uniqueness depends on active state.
CREATE UNIQUE INDEX "authentication_tokens_one_current_per_account_purpose_key"
    ON "system"."authentication_tokens" ("account_id", "purpose")
    WHERE "used_at" IS NULL AND "invalidated_at" IS NULL;

CREATE UNIQUE INDEX "email_suppressions_one_active_per_email_key"
    ON "system"."email_suppressions" ("email_digest")
    WHERE "resolved_at" IS NULL;

CREATE UNIQUE INDEX "account_devices_active_installation_digest_key"
    ON "system"."account_devices" ("installation_id_digest")
    WHERE "deactivated_at" IS NULL;

CREATE UNIQUE INDEX "account_devices_active_expo_push_token_key"
    ON "system"."account_devices" ("expo_push_token")
    WHERE "deactivated_at" IS NULL;

CREATE UNIQUE INDEX "branches_active_normalized_name_key"
    ON "booking"."branches" (lower(btrim("name")))
    WHERE "archived_at" IS NULL;

-- Audit history is append-only even if repository code attempts a mutation.
CREATE FUNCTION "system"."reject_audit_record_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit records are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "audit_records_reject_update_or_delete"
    BEFORE UPDATE OR DELETE ON "system"."audit_records"
    FOR EACH ROW EXECUTE FUNCTION "system"."reject_audit_record_mutation"();

CREATE TRIGGER "audit_records_reject_truncate"
    BEFORE TRUNCATE ON "system"."audit_records"
    FOR EACH STATEMENT EXECUTE FUNCTION "system"."reject_audit_record_mutation"();
