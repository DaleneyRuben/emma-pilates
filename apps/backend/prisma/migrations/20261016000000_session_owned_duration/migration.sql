-- WEB-027 (booking ADR-0004): a Session Schedule owns its duration; a Class
-- Type no longer has one. Existing schedules keep the minutes they generate
-- today, taken from their Class Type.
ALTER TABLE "booking"."session_schedules" ADD COLUMN "duration_minutes" SMALLINT;

UPDATE "booking"."session_schedules" AS schedule
SET "duration_minutes" = class_type."duration_minutes"
FROM "booking"."class_types" AS class_type
WHERE class_type."id" = schedule."class_type_id";

ALTER TABLE "booking"."session_schedules" ALTER COLUMN "duration_minutes" SET NOT NULL;

ALTER TABLE booking.session_schedules
  ADD CONSTRAINT session_schedules_duration_check CHECK (
    duration_minutes BETWEEN 5 AND 240
  );

-- Kept, nullable and unused, until no supported mobile release reads
-- classType.durationMinutes from the catalog.
ALTER TABLE "booking"."class_types" ALTER COLUMN "duration_minutes" DROP NOT NULL;
