-- Owner decision 2026-10-29: a refused Freeze does not spend the one Freeze
-- per Subscription. Once counts a requested or an approved row. A removed
-- row must not block either (ADR-0086). Expand-only: the old unique index
-- is replaced by a partial one; no column or value is dropped.

DROP INDEX "booking"."freezes_subscription_id_key";

CREATE UNIQUE INDEX "freezes_subscription_id_key"
  ON "booking"."freezes"("subscription_id")
  WHERE "state" <> 'refused' AND "deleted_at" IS NULL;
