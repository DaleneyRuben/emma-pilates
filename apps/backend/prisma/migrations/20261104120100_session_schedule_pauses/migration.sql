-- BKM-018 (owner approval 2026-11-04): a weekly series may be paused without
-- ending it. No Sessions are published on [paused_from, paused_until); a null
-- paused_until means paused until someone resumes it. Additive: every
-- existing series starts unpaused.
ALTER TABLE "booking"."session_schedules"
  ADD COLUMN "paused_from" DATE,
  ADD COLUMN "paused_until" DATE,
  ADD CONSTRAINT "session_schedules_pause_check" CHECK (
    ("paused_from" IS NOT NULL OR "paused_until" IS NULL)
    AND ("paused_until" IS NULL OR "paused_until" > "paused_from")
  );

-- A Session the pause withdraws records who paused the series.
ALTER TABLE "booking"."sessions"
  DROP CONSTRAINT "sessions_cancellation_check",
  ADD CONSTRAINT "sessions_cancellation_check" CHECK (
    (state = 'scheduled' AND cancellation_cause IS NULL
      AND cancelled_at IS NULL AND cancelled_by_account_id IS NULL)
    OR (state = 'cancelled' AND cancelled_at IS NOT NULL
      AND cancellation_cause IS NOT NULL AND (
        (cancellation_cause IN ('zero_bookings', 'minimum_not_met')
          AND cancelled_by_account_id IS NULL)
        OR (cancellation_cause IN ('no_substitute_trainer', 'schedule_changed', 'schedule_paused')
            AND cancelled_by_account_id IS NOT NULL)
      ))
  );
