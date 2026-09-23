-- Review-only SQL for NUT-002: the Prisma-generated portion of the proposed
-- 20260922010000_nutritionist_evaluations migration (prisma migrate diff from
-- the migrated schema, with the drift-only DropForeignKey lines for existing
-- raw composite keys removed). The database-only protections follow in
-- nutritionist-evaluations-constraints.sql.

-- CreateEnum
CREATE TYPE "booking"."EvaluationSlotState" AS ENUM ('published', 'withdrawn');

-- CreateEnum
CREATE TYPE "booking"."EvaluationState" AS ENUM ('booked', 'cancelled');

-- CreateEnum
CREATE TYPE "booking"."EvaluationCancellationCause" AS ENUM ('client_request', 'staff_cancelled');

-- CreateTable
CREATE TABLE "booking"."availability_blocks" (
    "id" UUID NOT NULL,
    "nutritionist_staff_member_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "starts_at_local" TIME(0) NOT NULL,
    "ends_at_local" TIME(0) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_by_account_id" UUID NOT NULL,
    "ended_by_account_id" UUID,
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."evaluation_slots" (
    "id" UUID NOT NULL,
    "availability_block_id" UUID NOT NULL,
    "nutritionist_staff_member_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "local_month" DATE NOT NULL,
    "state" "booking"."EvaluationSlotState" NOT NULL DEFAULT 'published',
    "withdrawn_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evaluation_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."evaluations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "evaluation_slot_id" UUID NOT NULL,
    "eligibility_month" DATE NOT NULL,
    "subscription_id" UUID NOT NULL,
    "state" "booking"."EvaluationState" NOT NULL DEFAULT 'booked',
    "created_by_account_id" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3),
    "cancelled_by_account_id" UUID,
    "cancellation_cause" "booking"."EvaluationCancellationCause",
    "day_reminder_recorded_at" TIMESTAMPTZ(3),
    "hour_reminder_recorded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_blocks_nutritionist_staff_member_id_weekday_st_idx" ON "booking"."availability_blocks"("nutritionist_staff_member_id", "weekday", "starts_at_local");

-- CreateIndex
CREATE INDEX "availability_blocks_effective_until_idx" ON "booking"."availability_blocks"("effective_until");

-- CreateIndex
CREATE INDEX "availability_blocks_branch_id_idx" ON "booking"."availability_blocks"("branch_id");

-- CreateIndex
CREATE INDEX "availability_blocks_created_by_account_id_idx" ON "booking"."availability_blocks"("created_by_account_id");

-- CreateIndex
CREATE INDEX "availability_blocks_ended_by_account_id_idx" ON "booking"."availability_blocks"("ended_by_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "availability_blocks_id_nutritionist_staff_member_id_branch__key" ON "booking"."availability_blocks"("id", "nutritionist_staff_member_id", "branch_id");

-- CreateIndex
CREATE INDEX "evaluation_slots_nutritionist_staff_member_id_starts_at_idx" ON "booking"."evaluation_slots"("nutritionist_staff_member_id", "starts_at");

-- CreateIndex
CREATE INDEX "evaluation_slots_branch_id_starts_at_idx" ON "booking"."evaluation_slots"("branch_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_slots_availability_block_id_starts_at_key" ON "booking"."evaluation_slots"("availability_block_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_slots_id_local_month_key" ON "booking"."evaluation_slots"("id", "local_month");

-- CreateIndex
CREATE INDEX "evaluations_client_id_state_idx" ON "booking"."evaluations"("client_id", "state");

-- CreateIndex
CREATE INDEX "evaluations_evaluation_slot_id_idx" ON "booking"."evaluations"("evaluation_slot_id");

-- CreateIndex
CREATE INDEX "evaluations_subscription_id_idx" ON "booking"."evaluations"("subscription_id");

-- CreateIndex
CREATE INDEX "evaluations_created_by_account_id_idx" ON "booking"."evaluations"("created_by_account_id");

-- CreateIndex
CREATE INDEX "evaluations_cancelled_by_account_id_idx" ON "booking"."evaluations"("cancelled_by_account_id");

-- AddForeignKey
ALTER TABLE "booking"."availability_blocks" ADD CONSTRAINT "availability_blocks_nutritionist_staff_member_id_fkey" FOREIGN KEY ("nutritionist_staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."availability_blocks" ADD CONSTRAINT "availability_blocks_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."availability_blocks" ADD CONSTRAINT "availability_blocks_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."availability_blocks" ADD CONSTRAINT "availability_blocks_ended_by_account_id_fkey" FOREIGN KEY ("ended_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluation_slots" ADD CONSTRAINT "evaluation_slots_block_fkey" FOREIGN KEY ("availability_block_id", "nutritionist_staff_member_id", "branch_id") REFERENCES "booking"."availability_blocks"("id", "nutritionist_staff_member_id", "branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluation_slots" ADD CONSTRAINT "evaluation_slots_nutritionist_fkey" FOREIGN KEY ("nutritionist_staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluation_slots" ADD CONSTRAINT "evaluation_slots_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluations" ADD CONSTRAINT "evaluations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluations" ADD CONSTRAINT "evaluations_slot_month_fkey" FOREIGN KEY ("evaluation_slot_id", "eligibility_month") REFERENCES "booking"."evaluation_slots"("id", "local_month") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluations" ADD CONSTRAINT "evaluations_subscription_client_fkey" FOREIGN KEY ("subscription_id", "client_id") REFERENCES "booking"."subscriptions"("id", "client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluations" ADD CONSTRAINT "evaluations_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."evaluations" ADD CONSTRAINT "evaluations_cancelled_by_account_id_fkey" FOREIGN KEY ("cancelled_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
