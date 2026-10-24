-- BKM-009: the Minimum Bookings check cancels as the system, like BOOK-004's
-- zero-booking check did. A separate migration, because PostgreSQL refuses a
-- new enum value in the transaction that added it.
ALTER TABLE "booking"."sessions"
  DROP CONSTRAINT "sessions_cancellation_check",
  ADD CONSTRAINT "sessions_cancellation_check" CHECK (
    (state = 'scheduled' AND cancellation_cause IS NULL
      AND cancelled_at IS NULL AND cancelled_by_account_id IS NULL)
    OR (state = 'cancelled' AND cancelled_at IS NOT NULL
      AND cancellation_cause IS NOT NULL AND (
        (cancellation_cause IN ('zero_bookings', 'minimum_not_met')
          AND cancelled_by_account_id IS NULL)
        OR (cancellation_cause IN ('no_substitute_trainer', 'schedule_changed')
            AND cancelled_by_account_id IS NOT NULL)
      ))
  );
