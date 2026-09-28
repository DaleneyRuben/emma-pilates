-- DropForeignKey
ALTER TABLE "booking"."staff_branch_assignments" DROP CONSTRAINT "staff_branch_assignments_staff_member_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."account_devices" DROP CONSTRAINT "account_devices_account_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."account_email_changes" DROP CONSTRAINT "account_email_changes_account_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."account_email_changes" DROP CONSTRAINT "account_email_changes_authentication_token_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."audit_records" DROP CONSTRAINT "audit_records_actor_account_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."authentication_sessions" DROP CONSTRAINT "authentication_sessions_account_device_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."authentication_sessions" DROP CONSTRAINT "authentication_sessions_account_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."authentication_tokens" DROP CONSTRAINT "authentication_tokens_account_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."email_suppressions" DROP CONSTRAINT "email_suppressions_resolved_by_account_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."idempotency_records" DROP CONSTRAINT "idempotency_records_account_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."notification_deliveries" DROP CONSTRAINT "notification_deliveries_notification_id_fkey";

-- DropForeignKey
ALTER TABLE "system"."notifications" DROP CONSTRAINT "notifications_account_id_fkey";

-- DropIndex
DROP INDEX "system"."accounts_email_key";

-- DropIndex
DROP INDEX "system"."idempotency_records_account_id_command_idempotency_key_key";

-- AlterTable
ALTER TABLE "back_office"."expense_categories" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "booking"."clients" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable: surrogate key backfilled for existing rows
ALTER TABLE "booking"."staff_branch_assignments" ADD COLUMN "id" UUID,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);
UPDATE "booking"."staff_branch_assignments" SET "id" = gen_random_uuid();
ALTER TABLE "booking"."staff_branch_assignments" ALTER COLUMN "id" SET NOT NULL,
DROP CONSTRAINT "staff_branch_assignments_pkey",
ADD CONSTRAINT "staff_branch_assignments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "booking"."staff_members" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable: surrogate key backfilled for existing rows
ALTER TABLE "system"."account_email_changes" ADD COLUMN "id" UUID,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);
UPDATE "system"."account_email_changes" SET "id" = gen_random_uuid();
ALTER TABLE "system"."account_email_changes" ALTER COLUMN "id" SET NOT NULL,
DROP CONSTRAINT "account_email_changes_pkey",
ADD CONSTRAINT "account_email_changes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "system"."accounts" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "system"."authentication_sessions" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "system"."authentication_throttle_events" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "system"."idempotency_records" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "system"."notifications" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AddForeignKey
ALTER TABLE "booking"."staff_branch_assignments" ADD CONSTRAINT "staff_branch_assignments_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."authentication_tokens" ADD CONSTRAINT "authentication_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."account_email_changes" ADD CONSTRAINT "account_email_changes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."account_email_changes" ADD CONSTRAINT "account_email_changes_authentication_token_id_fkey" FOREIGN KEY ("authentication_token_id") REFERENCES "system"."authentication_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."authentication_sessions" ADD CONSTRAINT "authentication_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."authentication_sessions" ADD CONSTRAINT "authentication_sessions_account_device_id_fkey" FOREIGN KEY ("account_device_id") REFERENCES "system"."account_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."email_suppressions" ADD CONSTRAINT "email_suppressions_resolved_by_account_id_fkey" FOREIGN KEY ("resolved_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."audit_records" ADD CONSTRAINT "audit_records_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."idempotency_records" ADD CONSTRAINT "idempotency_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."notifications" ADD CONSTRAINT "notifications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."account_devices" ADD CONSTRAINT "account_devices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "system"."notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique among live rows only (ADR-0086): a removed row never blocks a new one.
CREATE UNIQUE INDEX "accounts_email_key" ON "system"."accounts"("email") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "idempotency_records_account_id_command_idempotency_key_key" ON "system"."idempotency_records"("account_id", "command", "idempotency_key") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "account_email_changes_account_id_key" ON "system"."account_email_changes"("account_id") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "staff_branch_assignments_staff_member_id_branch_id_key" ON "booking"."staff_branch_assignments"("staff_member_id", "branch_id") WHERE "deleted_at" IS NULL;
