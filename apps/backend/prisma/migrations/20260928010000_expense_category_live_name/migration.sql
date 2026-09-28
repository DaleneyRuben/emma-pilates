-- A removed Expense Category frees its name (ADR-0086).
DROP INDEX "back_office"."expense_categories_normalized_name_key";

CREATE UNIQUE INDEX "expense_categories_normalized_name_key"
  ON "back_office"."expense_categories" (lower(btrim("name")))
  WHERE "deleted_at" IS NULL;
