-- Walkthrough finding 51 (owner 2026-11-08, approved this migration): the
-- Client may withdraw a Freeze request still in review. Expand-only: one new
-- enum value; the row keeps living (soft delete only, ADR-0086), and who
-- withdrew it and when go in decided_by_account_id and decided_at, which
-- freezes_decision_check already requires for every state but requested.

ALTER TYPE "booking"."FreezeState" ADD VALUE IF NOT EXISTS 'withdrawn';

-- Once per Subscription counts a requested or an approved row only, so a
-- withdrawn row, like a refused one, does not block another request. The
-- predicate names the counted values, not the new one: an enum value added
-- in this transaction cannot be used in it.
DROP INDEX "booking"."freezes_subscription_id_key";

CREATE UNIQUE INDEX "freezes_subscription_id_key"
  ON "booking"."freezes"("subscription_id")
  WHERE "state" IN ('requested', 'approved') AND "deleted_at" IS NULL;
