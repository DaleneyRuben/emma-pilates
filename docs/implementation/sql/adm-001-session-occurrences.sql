-- ADM-001 C1–C3: key generated Sessions by the schedule occurrence they stand
-- for, so moving one never lets the reconciler recreate its original start
-- (see docs/implementation/ADM-001-migration-review.md).
ALTER TABLE "booking"."sessions" ADD COLUMN "occurrence_starts_at" TIMESTAMPTZ(3);

UPDATE "booking"."sessions"
SET "occurrence_starts_at" = "starts_at"
WHERE "session_schedule_id" IS NOT NULL;

-- Expand-only: a worker still on the previous release inserts generated rows
-- without the column; the trigger keeps them valid.
CREATE FUNCTION "booking"."default_session_occurrence"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.session_schedule_id IS NOT NULL AND NEW.occurrence_starts_at IS NULL THEN
    NEW.occurrence_starts_at := NEW.starts_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "sessions_default_occurrence"
  BEFORE INSERT ON "booking"."sessions"
  FOR EACH ROW EXECUTE FUNCTION "booking"."default_session_occurrence"();

ALTER TABLE "booking"."sessions"
  ADD CONSTRAINT "sessions_occurrence_check"
  CHECK (("session_schedule_id" IS NULL) = ("occurrence_starts_at" IS NULL));

DROP INDEX "booking"."sessions_session_schedule_id_starts_at_key";
CREATE UNIQUE INDEX "sessions_session_schedule_id_occurrence_starts_at_key"
  ON "booking"."sessions"("session_schedule_id", "occurrence_starts_at");

ALTER TABLE "booking"."sessions"
  DROP CONSTRAINT "sessions_cancellation_check",
  ADD CONSTRAINT "sessions_cancellation_check" CHECK (
    (state = 'scheduled' AND cancellation_cause IS NULL
      AND cancelled_at IS NULL AND cancelled_by_account_id IS NULL)
    OR (state = 'cancelled' AND cancelled_at IS NOT NULL
      AND cancellation_cause IS NOT NULL AND (
        (cancellation_cause = 'zero_bookings' AND cancelled_by_account_id IS NULL)
        OR (cancellation_cause IN ('no_substitute_trainer', 'schedule_changed')
            AND cancelled_by_account_id IS NOT NULL)
      ))
  );
