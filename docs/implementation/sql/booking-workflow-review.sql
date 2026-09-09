-- Review-only SQL for BOOK-001. This file is not a Prisma migration and has
-- not been executed against any database.

CREATE TYPE "booking"."BookingState" AS ENUM (
  'booked', 'cancelled', 'rescheduled'
);

CREATE TYPE "booking"."BookingCancellationCause" AS ENUM (
  'client_request', 'session_cancelled'
);

CREATE TYPE "booking"."WaitlistClosureReason" AS ENUM (
  'left', 'promoted', 'session_cancelled', 'session_started'
);

CREATE TYPE "booking"."AttendanceOutcome" AS ENUM (
  'attended', 'no_show'
);

ALTER TABLE "booking"."sessions"
  ADD COLUMN "empty_booking_check_completed_at" TIMESTAMPTZ(3);

CREATE TABLE "booking"."bookings" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "state" "booking"."BookingState" NOT NULL DEFAULT 'booked',
  "created_by_account_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "cancelled_at" TIMESTAMPTZ(3),
  "cancelled_by_account_id" UUID,
  "cancellation_cause" "booking"."BookingCancellationCause",
  "rescheduled_to_booking_id" UUID,
  "rescheduled_at" TIMESTAMPTZ(3),
  "rescheduled_by_account_id" UUID,

  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking"."waitlist_entries" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "joined_by_account_id" UUID NOT NULL,
  "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(3),
  "closure_reason" "booking"."WaitlistClosureReason",
  "closed_by_account_id" UUID,
  "promoted_booking_id" UUID,

  CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking"."attendance_records" (
  "booking_id" UUID NOT NULL,
  "outcome" "booking"."AttendanceOutcome" NOT NULL,
  "recorded_by_account_id" UUID NOT NULL,
  "recorded_at" TIMESTAMPTZ(3) NOT NULL,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("booking_id")
);

CREATE UNIQUE INDEX "bookings_rescheduled_to_booking_id_key"
  ON "booking"."bookings"("rescheduled_to_booking_id");
CREATE UNIQUE INDEX "bookings_id_session_id_client_id_key"
  ON "booking"."bookings"("id", "session_id", "client_id");
CREATE UNIQUE INDEX "bookings_id_client_id_subscription_id_key"
  ON "booking"."bookings"("id", "client_id", "subscription_id");
CREATE UNIQUE INDEX "subscriptions_id_client_id_key"
  ON "booking"."subscriptions"("id", "client_id");
CREATE UNIQUE INDEX "waitlist_entries_promoted_booking_id_key"
  ON "booking"."waitlist_entries"("promoted_booking_id");

CREATE INDEX "bookings_session_id_idx" ON "booking"."bookings"("session_id");
CREATE INDEX "bookings_client_id_idx" ON "booking"."bookings"("client_id");
CREATE INDEX "bookings_subscription_id_idx" ON "booking"."bookings"("subscription_id");
CREATE INDEX "bookings_created_by_account_id_idx"
  ON "booking"."bookings"("created_by_account_id");
CREATE INDEX "bookings_cancelled_by_account_id_idx"
  ON "booking"."bookings"("cancelled_by_account_id");
CREATE INDEX "bookings_rescheduled_by_account_id_idx"
  ON "booking"."bookings"("rescheduled_by_account_id");
CREATE INDEX "waitlist_entries_session_id_joined_at_id_idx"
  ON "booking"."waitlist_entries"("session_id", "joined_at", "id");
CREATE INDEX "waitlist_entries_client_id_idx"
  ON "booking"."waitlist_entries"("client_id");
CREATE INDEX "waitlist_entries_joined_by_account_id_idx"
  ON "booking"."waitlist_entries"("joined_by_account_id");
CREATE INDEX "waitlist_entries_closed_by_account_id_idx"
  ON "booking"."waitlist_entries"("closed_by_account_id");
CREATE INDEX "attendance_records_recorded_by_account_id_idx"
  ON "booking"."attendance_records"("recorded_by_account_id");

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "booking"."sessions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "bookings_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "bookings_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "booking"."subscriptions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "bookings_created_by_account_id_fkey"
    FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "bookings_cancelled_by_account_id_fkey"
    FOREIGN KEY ("cancelled_by_account_id") REFERENCES "system"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "bookings_rescheduled_by_account_id_fkey"
    FOREIGN KEY ("rescheduled_by_account_id") REFERENCES "system"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "bookings_rescheduled_to_booking_id_fkey"
    FOREIGN KEY ("rescheduled_to_booking_id") REFERENCES "booking"."bookings"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "booking"."sessions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "waitlist_entries_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "waitlist_entries_joined_by_account_id_fkey"
    FOREIGN KEY ("joined_by_account_id") REFERENCES "system"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "waitlist_entries_closed_by_account_id_fkey"
    FOREIGN KEY ("closed_by_account_id") REFERENCES "system"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "waitlist_entries_promoted_booking_id_fkey"
    FOREIGN KEY ("promoted_booking_id") REFERENCES "booking"."bookings"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."attendance_records"
  ADD CONSTRAINT "attendance_records_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "booking"."bookings"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_records_recorded_by_account_id_fkey"
    FOREIGN KEY ("recorded_by_account_id") REFERENCES "system"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
