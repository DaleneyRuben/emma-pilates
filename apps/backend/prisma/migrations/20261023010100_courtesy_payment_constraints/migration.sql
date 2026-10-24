-- REL-011 (booking ADR-0012): only a hidden Plan may cost Bs 0, and only a
-- courtesy Payment settles one. A courtesy Payment is Bs 0 with no Credit, no
-- Purchase Intent, and no collection Branch, and the Administrator who records
-- it confirms it on the spot, like a cash sale.

ALTER TABLE "booking"."plans"
  ADD CONSTRAINT "plans_free_only_hidden_check" CHECK (
    "price_centavos" > 0 OR "hidden_at" IS NOT NULL
  );

ALTER TABLE "booking"."payments"
  DROP CONSTRAINT "payments_amounts_check",
  ADD CONSTRAINT "payments_amounts_check" CHECK (
    ("plan_price_centavos" > 0
      OR ("method" = 'courtesy' AND "plan_price_centavos" = 0))
    AND "credit_applied_centavos" >= 0
    AND "amount_due_centavos" >= 0
    AND "credit_applied_centavos" <= "plan_price_centavos"
    AND "amount_due_centavos" = "plan_price_centavos" - "credit_applied_centavos"
  ),
  DROP CONSTRAINT "payments_method_fields_check",
  ADD CONSTRAINT "payments_method_fields_check" CHECK (
    ("method" = 'transfer'
      AND "purchase_intent_id" IS NOT NULL
      AND "collected_at_branch_id" IS NULL
      AND "amount_due_centavos" > 0)
    OR ("method" = 'cash'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NOT NULL
      AND "amount_due_centavos" > 0
      AND "state" = 'confirmed'
      AND "decided_by_account_id" = "submitted_by_account_id")
    OR ("method" = 'credit_only'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NULL
      AND "amount_due_centavos" = 0
      AND "state" = 'confirmed'
      AND "decided_by_account_id" = "submitted_by_account_id")
    OR ("method" = 'courtesy'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NULL
      AND "plan_price_centavos" = 0
      AND "amount_due_centavos" = 0
      AND "state" = 'confirmed'
      AND "decided_by_account_id" = "submitted_by_account_id")
  );
