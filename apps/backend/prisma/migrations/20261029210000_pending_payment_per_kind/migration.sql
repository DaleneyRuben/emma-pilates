-- A pending Evaluation Payment and a pending Plan Payment are different
-- sales. One pending row per Client per kind. Expand-only: the old index
-- is replaced by a partial one; no column or value is dropped.

DROP INDEX "booking"."payments_one_pending_per_client_key";

CREATE UNIQUE INDEX "payments_one_pending_per_client_kind_key"
  ON "booking"."payments" ("client_id", "kind")
  WHERE "state" = 'pending';
