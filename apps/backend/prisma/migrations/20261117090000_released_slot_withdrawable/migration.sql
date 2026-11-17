-- FIX-062 (owner approval 2026-11-17): a slot whose only booked Evaluation
-- was released by the studio is free. Ending its block may withdraw it like
-- any other free slot. Expand-only: the function is replaced, no data moves.

CREATE OR REPLACE FUNCTION "booking"."protect_evaluation_slot"()
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
        WHERE e."evaluation_slot_id" = OLD."id"
          AND e."state" = 'booked'
          AND e."slot_released_at" IS NULL) THEN
        RAISE EXCEPTION 'evaluation slot has a booked evaluation' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
