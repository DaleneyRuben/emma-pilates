-- BKM-009: the Minimum Bookings check cancels the Bookings of the Session it
-- cancels as the system, so a Booking cancelled because its Session was may
-- name no Account. Every other cancellation still names who made it.
ALTER TABLE "booking"."bookings"
  DROP CONSTRAINT "bookings_state_fields_check",
  ADD CONSTRAINT "bookings_state_fields_check" CHECK (
    ("state" = 'booked'
      AND "cancelled_at" IS NULL
      AND "cancelled_by_account_id" IS NULL
      AND "cancellation_cause" IS NULL
      AND "rescheduled_to_booking_id" IS NULL
      AND "rescheduled_at" IS NULL
      AND "rescheduled_by_account_id" IS NULL)
    OR ("state" = 'cancelled'
      AND "cancelled_at" IS NOT NULL
      AND ("cancelled_by_account_id" IS NOT NULL
        OR "cancellation_cause" = 'session_cancelled')
      AND "cancellation_cause" IS NOT NULL
      AND "rescheduled_to_booking_id" IS NULL
      AND "rescheduled_at" IS NULL
      AND "rescheduled_by_account_id" IS NULL
      AND "cancelled_at" >= "created_at")
    OR ("state" = 'rescheduled'
      AND "cancelled_at" IS NULL
      AND "cancelled_by_account_id" IS NULL
      AND "cancellation_cause" IS NULL
      AND "rescheduled_to_booking_id" IS NOT NULL
      AND "rescheduled_at" IS NOT NULL
      AND "rescheduled_by_account_id" IS NOT NULL
      AND "rescheduled_at" >= "created_at")
  );
