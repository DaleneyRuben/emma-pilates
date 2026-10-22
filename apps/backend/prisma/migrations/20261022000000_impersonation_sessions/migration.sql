-- FUT-001 / ADR-0100: an Administrator's 30-minute view of the Staff app as one
-- Trainer, Assistant, or Nutritionist, tied to their own mobile Authentication
-- Session, and the link from every audit record written meanwhile.

-- CreateEnum
CREATE TYPE "system"."ImpersonationEndReason" AS ENUM ('exited', 'expired', 'logged_out', 'revoked');

-- AlterTable
ALTER TABLE "system"."audit_records" ADD COLUMN     "impersonation_id" UUID;

-- CreateTable
CREATE TABLE "system"."impersonation_sessions" (
    "id" UUID NOT NULL,
    "authentication_session_id" UUID NOT NULL,
    "administrator_account_id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "end_reason" "system"."ImpersonationEndReason",
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impersonation_sessions_administrator_account_id_started_at_idx" ON "system"."impersonation_sessions"("administrator_account_id", "started_at");

-- CreateIndex
CREATE INDEX "impersonation_sessions_staff_member_id_started_at_idx" ON "system"."impersonation_sessions"("staff_member_id", "started_at");

-- CreateIndex
CREATE INDEX "audit_records_impersonation_id_idx" ON "system"."audit_records"("impersonation_id");

-- AddForeignKey
ALTER TABLE "system"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_authentication_session_id_fkey" FOREIGN KEY ("authentication_session_id") REFERENCES "system"."authentication_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_administrator_account_id_fkey" FOREIGN KEY ("administrator_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."audit_records" ADD CONSTRAINT "audit_records_impersonation_id_fkey" FOREIGN KEY ("impersonation_id") REFERENCES "system"."impersonation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One active Impersonation per Authentication Session, among live rows only (ADR-0086).
CREATE UNIQUE INDEX "impersonation_sessions_one_active_per_session" ON "system"."impersonation_sessions"("authentication_session_id") WHERE "ended_at" IS NULL AND "deleted_at" IS NULL;

-- An ended row names its reason, and only an ended row does.
ALTER TABLE "system"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_end_reason_with_ended_at" CHECK (("ended_at" IS NULL) = ("end_reason" IS NULL));

-- The time box runs forward from the start.
ALTER TABLE "system"."impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_expires_after_start" CHECK ("expires_at" > "started_at");
