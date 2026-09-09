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

-- Proposed PostgreSQL protections not expressible in the Prisma fragment.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE booking.plans
  ADD CONSTRAINT plans_values_check CHECK (
    length(btrim(name)) > 0 AND duration_months IN (1, 3, 6, 12)
    AND class_allowance > 0 AND price_centavos >= 0 AND display_order >= 0
  );
CREATE UNIQUE INDEX plans_visible_normalized_name_key
  ON booking.plans (lower(btrim(name))) WHERE hidden_at IS NULL;

ALTER TABLE booking.class_types
  ADD CONSTRAINT class_types_values_check CHECK (
    length(btrim(name)) > 0 AND length(btrim(description)) > 0
    AND duration_minutes > 0 AND default_capacity > 0
  );
CREATE UNIQUE INDEX class_types_active_normalized_name_key
  ON booking.class_types (lower(btrim(name))) WHERE archived_at IS NULL;

ALTER TABLE booking.session_schedules
  ADD CONSTRAINT session_schedules_values_check CHECK (
    weekday BETWEEN 1 AND 7 AND capacity > 0
    AND (effective_until IS NULL OR effective_until > effective_from)
  );

ALTER TABLE booking.sessions
  ADD CONSTRAINT sessions_values_check CHECK (ends_at > starts_at AND capacity > 0),
  -- Explicit IS NOT NULL is necessary: PostgreSQL CHECK accepts unknown/null.
  ADD CONSTRAINT sessions_cancellation_check CHECK (
    (state = 'scheduled' AND cancellation_cause IS NULL
      AND cancelled_at IS NULL AND cancelled_by_account_id IS NULL)
    OR (state = 'cancelled' AND cancelled_at IS NOT NULL
      AND cancellation_cause IS NOT NULL AND (
        (cancellation_cause = 'zero_bookings' AND cancelled_by_account_id IS NULL)
        OR (cancellation_cause = 'no_substitute_trainer' AND cancelled_by_account_id IS NOT NULL)
      ))
  ),
  ADD CONSTRAINT sessions_branch_no_overlap EXCLUDE USING gist (
    branch_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (state = 'scheduled'),
  ADD CONSTRAINT sessions_trainer_no_overlap EXCLUDE USING gist (
    trainer_staff_member_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (state = 'scheduled');

ALTER TABLE booking.subscriptions
  ADD CONSTRAINT subscriptions_values_check CHECK (
    length(btrim(plan_name_snapshot)) > 0
    AND duration_months_snapshot IN (1, 3, 6, 12)
    AND original_class_allowance > 0
    AND remaining_class_allowance BETWEEN 0 AND original_class_allowance
    AND ends_on >= starts_on
  ),
  ADD CONSTRAINT subscriptions_state_check CHECK (
    (state = 'active' AND expired_at IS NULL)
    OR (state = 'expired' AND expired_at IS NOT NULL)
  );
CREATE UNIQUE INDEX subscriptions_one_active_per_client_key
  ON booking.subscriptions (client_id) WHERE state = 'active';

ALTER TABLE booking.promotions
  ADD CONSTRAINT promotions_values_check CHECK (
    length(btrim(headline)) > 0 AND length(btrim(description)) > 0
    AND display_ends_on >= display_starts_on AND display_order >= 0
  ),
  ADD CONSTRAINT promotions_publication_check CHECK (
    published_at IS NULL OR (image_asset_id IS NOT NULL AND archived_at IS NULL)
  );
