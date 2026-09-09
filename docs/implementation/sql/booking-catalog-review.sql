-- CreateEnum
CREATE TYPE "booking"."SessionState" AS ENUM ('scheduled', 'cancelled');

-- CreateEnum
CREATE TYPE "booking"."SessionCancellationCause" AS ENUM ('zero_bookings', 'no_substitute_trainer');

-- CreateEnum
CREATE TYPE "booking"."SubscriptionState" AS ENUM ('active', 'expired');

-- CreateTable
CREATE TABLE "booking"."plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "duration_months" SMALLINT NOT NULL,
    "class_allowance" INTEGER NOT NULL,
    "price_centavos" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,
    "hidden_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."class_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration_minutes" SMALLINT NOT NULL,
    "default_capacity" SMALLINT NOT NULL,
    "equipment_needs" TEXT,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "class_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."session_schedules" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "class_type_id" UUID NOT NULL,
    "trainer_staff_member_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "starts_at_local" TIME(0) NOT NULL,
    "capacity" SMALLINT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "session_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."sessions" (
    "id" UUID NOT NULL,
    "session_schedule_id" UUID,
    "branch_id" UUID NOT NULL,
    "class_type_id" UUID NOT NULL,
    "trainer_staff_member_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "capacity" SMALLINT NOT NULL,
    "state" "booking"."SessionState" NOT NULL DEFAULT 'scheduled',
    "is_exception" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_cause" "booking"."SessionCancellationCause",
    "cancelled_at" TIMESTAMPTZ(3),
    "cancelled_by_account_id" UUID,
    "cancellation_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."subscriptions" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "plan_name_snapshot" TEXT NOT NULL,
    "duration_months_snapshot" SMALLINT NOT NULL,
    "original_class_allowance" INTEGER NOT NULL,
    "remaining_class_allowance" INTEGER NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "state" "booking"."SubscriptionState" NOT NULL DEFAULT 'active',
    "activated_at" TIMESTAMPTZ(3) NOT NULL,
    "expired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."promotions" (
    "id" UUID NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_asset_id" UUID,
    "display_starts_on" DATE NOT NULL,
    "display_ends_on" DATE NOT NULL,
    "display_order" INTEGER NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plans_hidden_at_display_order_id_idx" ON "booking"."plans"("hidden_at", "display_order", "id");

-- CreateIndex
CREATE INDEX "session_schedules_branch_id_effective_from_idx" ON "booking"."session_schedules"("branch_id", "effective_from");

-- CreateIndex
CREATE INDEX "session_schedules_class_type_id_idx" ON "booking"."session_schedules"("class_type_id");

-- CreateIndex
CREATE INDEX "session_schedules_trainer_staff_member_id_idx" ON "booking"."session_schedules"("trainer_staff_member_id");

-- CreateIndex
CREATE INDEX "sessions_branch_id_starts_at_id_idx" ON "booking"."sessions"("branch_id", "starts_at", "id");

-- CreateIndex
CREATE INDEX "sessions_trainer_staff_member_id_starts_at_idx" ON "booking"."sessions"("trainer_staff_member_id", "starts_at");

-- CreateIndex
CREATE INDEX "sessions_class_type_id_idx" ON "booking"."sessions"("class_type_id");

-- CreateIndex
CREATE INDEX "sessions_cancelled_by_account_id_idx" ON "booking"."sessions"("cancelled_by_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_schedule_id_starts_at_key" ON "booking"."sessions"("session_schedule_id", "starts_at");

-- CreateIndex
CREATE INDEX "subscriptions_client_id_starts_on_idx" ON "booking"."subscriptions"("client_id", "starts_on");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "booking"."subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_state_ends_on_idx" ON "booking"."subscriptions"("state", "ends_on");

-- CreateIndex
CREATE INDEX "promotions_image_asset_id_idx" ON "booking"."promotions"("image_asset_id");

-- CreateIndex
CREATE INDEX "promotions_display_order_id_idx" ON "booking"."promotions"("display_order", "id");

-- AddForeignKey
ALTER TABLE "booking"."session_schedules" ADD CONSTRAINT "session_schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."session_schedules" ADD CONSTRAINT "session_schedules_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "booking"."class_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."session_schedules" ADD CONSTRAINT "session_schedules_trainer_staff_member_id_fkey" FOREIGN KEY ("trainer_staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."sessions" ADD CONSTRAINT "sessions_session_schedule_id_fkey" FOREIGN KEY ("session_schedule_id") REFERENCES "booking"."session_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."sessions" ADD CONSTRAINT "sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."sessions" ADD CONSTRAINT "sessions_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "booking"."class_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."sessions" ADD CONSTRAINT "sessions_trainer_staff_member_id_fkey" FOREIGN KEY ("trainer_staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."sessions" ADD CONSTRAINT "sessions_cancelled_by_account_id_fkey" FOREIGN KEY ("cancelled_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."subscriptions" ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "booking"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."promotions" ADD CONSTRAINT "promotions_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
