-- BE-007 G5: an account_closure entry forfeits the remaining Credit and has no
-- parent Reservation or Referral.
ALTER TABLE "booking"."credit_ledger_entries"
  DROP CONSTRAINT "credit_ledger_entries_parent_check",
  ADD CONSTRAINT "credit_ledger_entries_parent_check" CHECK (
    ("kind" = 'referral_award'
      AND "referral_id" IS NOT NULL
      AND "reservation_id" IS NULL)
    OR ("kind" IN ('payment_reservation', 'payment_spend', 'payment_release')
      AND "reservation_id" IS NOT NULL
      AND "referral_id" IS NULL)
    OR ("kind" = 'account_closure'
      AND "reservation_id" IS NULL
      AND "referral_id" IS NULL)
  );

-- At most one forfeiture per Client: closure happens once.
CREATE UNIQUE INDEX "credit_ledger_entries_one_closure_per_client_key"
  ON "booking"."credit_ledger_entries" ("client_id") WHERE "kind" = 'account_closure';
