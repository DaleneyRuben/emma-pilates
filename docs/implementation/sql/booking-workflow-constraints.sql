-- PostgreSQL protections for BOOK-001 that Prisma does not express.

ALTER TABLE booking.bookings
  ADD CONSTRAINT bookings_subscription_client_fkey
    FOREIGN KEY (subscription_id, client_id)
    REFERENCES booking.subscriptions (id, client_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT bookings_reschedule_same_client_subscription_fkey
    FOREIGN KEY (rescheduled_to_booking_id, client_id, subscription_id)
    REFERENCES booking.bookings (id, client_id, subscription_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT bookings_state_fields_check CHECK (
    (state = 'booked'
      AND cancelled_at IS NULL
      AND cancelled_by_account_id IS NULL
      AND cancellation_cause IS NULL
      AND rescheduled_to_booking_id IS NULL
      AND rescheduled_at IS NULL
      AND rescheduled_by_account_id IS NULL)
    OR (state = 'cancelled'
      AND cancelled_at IS NOT NULL
      AND cancelled_by_account_id IS NOT NULL
      AND cancellation_cause IS NOT NULL
      AND rescheduled_to_booking_id IS NULL
      AND rescheduled_at IS NULL
      AND rescheduled_by_account_id IS NULL
      AND cancelled_at >= created_at)
    OR (state = 'rescheduled'
      AND cancelled_at IS NULL
      AND cancelled_by_account_id IS NULL
      AND cancellation_cause IS NULL
      AND rescheduled_to_booking_id IS NOT NULL
      AND rescheduled_at IS NOT NULL
      AND rescheduled_by_account_id IS NOT NULL
      AND rescheduled_at >= created_at)
  );

ALTER TABLE booking.waitlist_entries
  ADD CONSTRAINT waitlist_entries_promoted_booking_same_client_session_fkey
    FOREIGN KEY (promoted_booking_id, session_id, client_id)
    REFERENCES booking.bookings (id, session_id, client_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT waitlist_entries_state_fields_check CHECK (
    (closed_at IS NULL
      AND closure_reason IS NULL
      AND closed_by_account_id IS NULL
      AND promoted_booking_id IS NULL)
    OR (closed_at IS NOT NULL
      AND closure_reason = 'left'
      AND closed_by_account_id IS NOT NULL
      AND promoted_booking_id IS NULL
      AND closed_at >= joined_at)
    OR (closed_at IS NOT NULL
      AND closure_reason = 'promoted'
      AND closed_by_account_id IS NULL
      AND promoted_booking_id IS NOT NULL
      AND closed_at >= joined_at)
    OR (closed_at IS NOT NULL
      AND closure_reason IN ('session_cancelled', 'session_started')
      AND closed_by_account_id IS NULL
      AND promoted_booking_id IS NULL
      AND closed_at >= joined_at)
  );

ALTER TABLE booking.attendance_records
  ADD CONSTRAINT attendance_records_time_check CHECK (updated_at >= recorded_at);

CREATE UNIQUE INDEX bookings_one_live_per_session_client_key
  ON booking.bookings (session_id, client_id) WHERE state = 'booked';
CREATE UNIQUE INDEX waitlist_entries_one_active_per_session_client_key
  ON booking.waitlist_entries (session_id, client_id) WHERE closed_at IS NULL;

CREATE INDEX bookings_live_by_session_idx
  ON booking.bookings (session_id) WHERE state = 'booked';
CREATE INDEX bookings_live_by_client_idx
  ON booking.bookings (client_id) WHERE state = 'booked';
CREATE INDEX bookings_by_subscription_idx
  ON booking.bookings (subscription_id);
CREATE INDEX waitlist_entries_active_queue_idx
  ON booking.waitlist_entries (session_id, joined_at, id) WHERE closed_at IS NULL;
CREATE INDEX waitlist_entries_active_by_client_idx
  ON booking.waitlist_entries (client_id) WHERE closed_at IS NULL;
