
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

-- PostgreSQL invariants Prisma cannot express.

-- Availability Block values: ISO weekday, 15-minute grid, at least one 45-minute
-- slot, and a well-formed inclusive-start/exclusive-end effective range.
ALTER TABLE "booking"."availability_blocks"
  ADD CONSTRAINT "availability_blocks_values_check" CHECK (
    "weekday" BETWEEN 1 AND 7
    AND "ends_at_local" > "starts_at_local"
    AND "ends_at_local" - "starts_at_local" >= interval '45 minutes'
    AND extract(second FROM "starts_at_local") = 0
    AND extract(second FROM "ends_at_local") = 0
    AND extract(minute FROM "starts_at_local")::int % 15 = 0
    AND extract(minute FROM "ends_at_local")::int % 15 = 0
    AND ("effective_until" IS NULL OR "effective_until" >= "effective_from")
  ),
  -- Explicit IS NOT NULL: PostgreSQL CHECK accepts unknown/null.
  ADD CONSTRAINT "availability_blocks_end_check" CHECK (
    ("effective_until" IS NULL AND "ended_at" IS NULL AND "ended_by_account_id" IS NULL)
    OR ("effective_until" IS NOT NULL AND "ended_at" IS NOT NULL
        AND "ended_by_account_id" IS NOT NULL AND "ended_at" >= "created_at")
  ),
  -- One Nutritionist never publishes overlapping weekly ranges, at any Branch.
  -- An empty effective range (until = from) overlaps nothing. The anchor date
  -- only turns two time values into a comparable range.
  ADD CONSTRAINT "availability_blocks_nutritionist_no_overlap" EXCLUDE USING gist (
    "nutritionist_staff_member_id" WITH =,
    "weekday" WITH =,
    daterange("effective_from", "effective_until", '[)') WITH &&,
    tsrange(date '2000-01-03' + "starts_at_local",
            date '2000-01-03' + "ends_at_local", '[)') WITH &&
  );

-- Evaluation slot values: fixed 45-minute length and the Bolivia month of the start.
ALTER TABLE "booking"."evaluation_slots"
  ADD CONSTRAINT "evaluation_slots_values_check" CHECK (
    -- timestamptz - timestamptz is immutable; timestamptz + interval is only stable.
    "ends_at" - "starts_at" = interval '45 minutes'
    -- timezone(text, timestamptz) and date_trunc(text, timestamp) are immutable.
    AND "local_month" = date_trunc('month', "starts_at" AT TIME ZONE 'America/La_Paz')::date
  ),
  ADD CONSTRAINT "evaluation_slots_state_check" CHECK (
    ("state" = 'published' AND "withdrawn_at" IS NULL)
    OR ("state" = 'withdrawn' AND "withdrawn_at" IS NOT NULL AND "withdrawn_at" >= "created_at")
  ),
  -- One Nutritionist never has two published slots at the same time, at any Branch.
  ADD CONSTRAINT "evaluation_slots_nutritionist_no_overlap" EXCLUDE USING gist (
    "nutritionist_staff_member_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("state" = 'published');

CREATE INDEX "evaluation_slots_published_starts_at_idx"
  ON "booking"."evaluation_slots" ("starts_at", "id") WHERE "state" = 'published';

-- Evaluation values and complete, mutually exclusive cancellation fields.
ALTER TABLE "booking"."evaluations"
  ADD CONSTRAINT "evaluations_values_check" CHECK (
    extract(day FROM "eligibility_month") = 1
    AND ("day_reminder_recorded_at" IS NULL OR "day_reminder_recorded_at" >= "created_at")
    AND ("hour_reminder_recorded_at" IS NULL OR "hour_reminder_recorded_at" >= "created_at")
  ),
  ADD CONSTRAINT "evaluations_state_check" CHECK (
    ("state" = 'booked' AND "cancelled_at" IS NULL
      AND "cancelled_by_account_id" IS NULL AND "cancellation_cause" IS NULL)
    OR ("state" = 'cancelled' AND "cancelled_at" IS NOT NULL
      AND "cancelled_by_account_id" IS NOT NULL AND "cancellation_cause" IS NOT NULL
      AND "cancelled_at" >= "created_at")
  );

-- A slot holds at most one live Evaluation; a cancelled one frees it.
CREATE UNIQUE INDEX "evaluations_one_booked_per_slot_key"
  ON "booking"."evaluations" ("evaluation_slot_id") WHERE "state" = 'booked';
-- One booked Evaluation per Client per Bolivia month (D8); cancellation frees it (D9).
CREATE UNIQUE INDEX "evaluations_one_booked_per_client_month_key"
  ON "booking"."evaluations" ("client_id", "eligibility_month") WHERE "state" = 'booked';
CREATE INDEX "evaluations_reminders_pending_idx"
  ON "booking"."evaluations" ("evaluation_slot_id")
  WHERE "state" = 'booked' AND "hour_reminder_recorded_at" IS NULL;

-- Availability Blocks, slots, and Evaluations are history: never deleted.
CREATE FUNCTION "booking"."reject_evaluation_history_delete"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% rows are never deleted', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

-- Block immutability: the published definition never changes. The only
-- transition sets or shortens the exclusive end, with its actor and time.
CREATE FUNCTION "booking"."protect_availability_block"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."nutritionist_staff_member_id" <> OLD."nutritionist_staff_member_id"
        OR NEW."branch_id" <> OLD."branch_id"
        OR NEW."weekday" <> OLD."weekday"
        OR NEW."starts_at_local" <> OLD."starts_at_local"
        OR NEW."ends_at_local" <> OLD."ends_at_local"
        OR NEW."effective_from" <> OLD."effective_from"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'availability block definition is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."effective_until" IS NOT NULL AND (
        NEW."effective_until" IS NULL OR NEW."effective_until" > OLD."effective_until") THEN
        RAISE EXCEPTION 'availability block end can only move earlier' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "availability_blocks_protect_update"
    BEFORE UPDATE ON "booking"."availability_blocks"
    FOR EACH ROW EXECUTE FUNCTION "booking"."protect_availability_block"();

CREATE TRIGGER "availability_blocks_reject_delete"
    BEFORE DELETE OR TRUNCATE ON "booking"."availability_blocks"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_evaluation_history_delete"();

-- Slot immutability: an occurrence never moves; it is withdrawn at most once,
-- and never while a booked Evaluation holds it.
CREATE FUNCTION "booking"."protect_evaluation_slot"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."availability_block_id" <> OLD."availability_block_id"
        OR NEW."nutritionist_staff_member_id" <> OLD."nutritionist_staff_member_id"
        OR NEW."branch_id" <> OLD."branch_id"
        OR NEW."starts_at" <> OLD."starts_at"
        OR NEW."ends_at" <> OLD."ends_at"
        OR NEW."local_month" <> OLD."local_month"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'evaluation slot occurrence is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" = 'withdrawn' AND (
        NEW."state" <> OLD."state"
        OR NEW."withdrawn_at" IS DISTINCT FROM OLD."withdrawn_at") THEN
        RAISE EXCEPTION 'evaluation slot is withdrawn' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" = 'published' AND NEW."state" = 'withdrawn' AND EXISTS (
        SELECT 1 FROM "booking"."evaluations" e
        WHERE e."evaluation_slot_id" = OLD."id" AND e."state" = 'booked') THEN
        RAISE EXCEPTION 'evaluation slot has a booked evaluation' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "evaluation_slots_protect_update"
    BEFORE UPDATE ON "booking"."evaluation_slots"
    FOR EACH ROW EXECUTE FUNCTION "booking"."protect_evaluation_slot"();

CREATE TRIGGER "evaluation_slots_reject_delete"
    BEFORE DELETE OR TRUNCATE ON "booking"."evaluation_slots"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_evaluation_history_delete"();

-- A booked Evaluation may only be inserted against a published slot. The share
-- lock orders it against a concurrent withdrawal of the same slot.
CREATE FUNCTION "booking"."assert_evaluation_slot_published"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    slot_state "booking"."EvaluationSlotState";
BEGIN
    IF NEW."state" = 'booked' THEN
        SELECT s."state" INTO slot_state
        FROM "booking"."evaluation_slots" s
        WHERE s."id" = NEW."evaluation_slot_id"
        FOR SHARE;
        IF slot_state IS DISTINCT FROM 'published' THEN
            RAISE EXCEPTION 'evaluation slot is not published' USING ERRCODE = '55000';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "evaluations_assert_slot_published"
    BEFORE INSERT ON "booking"."evaluations"
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_evaluation_slot_published"();

-- Evaluation immutability: only booked -> cancelled, once, and the one-time
-- setting of each reminder marker.
CREATE FUNCTION "booking"."protect_evaluation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."evaluation_slot_id" <> OLD."evaluation_slot_id"
        OR NEW."eligibility_month" <> OLD."eligibility_month"
        OR NEW."subscription_id" <> OLD."subscription_id"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'evaluation reservation is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" = 'cancelled' AND (
        NEW."state" <> OLD."state"
        OR NEW."cancelled_at" IS DISTINCT FROM OLD."cancelled_at"
        OR NEW."cancelled_by_account_id" IS DISTINCT FROM OLD."cancelled_by_account_id"
        OR NEW."cancellation_cause" IS DISTINCT FROM OLD."cancellation_cause") THEN
        RAISE EXCEPTION 'evaluation cancellation is final' USING ERRCODE = '55000';
    END IF;
    IF (OLD."day_reminder_recorded_at" IS NOT NULL
            AND NEW."day_reminder_recorded_at" IS DISTINCT FROM OLD."day_reminder_recorded_at")
        OR (OLD."hour_reminder_recorded_at" IS NOT NULL
            AND NEW."hour_reminder_recorded_at" IS DISTINCT FROM OLD."hour_reminder_recorded_at") THEN
        RAISE EXCEPTION 'evaluation reminder markers are set once' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "evaluations_protect_update"
    BEFORE UPDATE ON "booking"."evaluations"
    FOR EACH ROW EXECUTE FUNCTION "booking"."protect_evaluation"();

CREATE TRIGGER "evaluations_reject_delete"
    BEFORE DELETE OR TRUNCATE ON "booking"."evaluations"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_evaluation_history_delete"();
