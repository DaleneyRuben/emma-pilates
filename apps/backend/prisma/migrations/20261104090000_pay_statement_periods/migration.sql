-- BKO-009 (ADR-0109): a Trainer's Pay Statement covers any period, a day, a
-- week, a date range or a month; the Coordinator's stays a month. Approved by
-- the owner on 2026-11-04 («Si apruebo», «Con tu recomendación»).
--
-- The period is [period_start, period_end): Bolivia civil dates, end
-- exclusive. `month` stays for the Staff app already released (ADR-0016) and
-- is the first day of the period's month.

ALTER TABLE "back_office"."pay_statements"
    ADD COLUMN "period_start" DATE,
    ADD COLUMN "period_end" DATE;

-- Every statement so far covered its whole month.
UPDATE "back_office"."pay_statements"
   SET "period_start" = "month",
       "period_end" = ("month" + interval '1 month')::date;

ALTER TABLE "back_office"."pay_statements"
    ALTER COLUMN "period_start" SET NOT NULL,
    ALTER COLUMN "period_end" SET NOT NULL,
    ADD CONSTRAINT "pay_statements_period_check" CHECK (
        "period_start" < "period_end"
        AND "month" = date_trunc('month', "period_start"::timestamp)::date
    );

-- One live statement per Staff Member per month becomes: no two live
-- statements of one Staff Member overlap, so a class or a commission is never
-- paid twice. Removed statements keep their rows and never block (ADR-0086).
-- btree_gist (booking_catalog) gives uuid its equality in a gist index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP INDEX "back_office"."pay_statements_staff_member_month_live_key";

ALTER TABLE "back_office"."pay_statements"
    ADD CONSTRAINT "pay_statements_staff_member_period_no_overlap" EXCLUDE USING gist (
        "staff_member_id" WITH =,
        daterange("period_start", "period_end", '[)') WITH &&
    ) WHERE ("deleted_at" IS NULL);

CREATE INDEX "pay_statements_period_start_period_end_idx"
    ON "back_office"."pay_statements"("period_start", "period_end");
