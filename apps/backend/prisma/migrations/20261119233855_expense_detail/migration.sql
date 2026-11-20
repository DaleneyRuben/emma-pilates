-- W11 A (owner, 2026-11-19): an optional free-text detail on an Expense,
-- shown in the Gastos «Detalle» column. Nullable, so every existing row and
-- every earlier admin web keep working; never blank when present.
ALTER TABLE "back_office"."expenses" ADD COLUMN     "detail" TEXT;

ALTER TABLE "back_office"."expenses" ADD CONSTRAINT "expenses_detail_check" CHECK (
  "detail" IS NULL OR char_length(btrim("detail")) BETWEEN 1 AND 120
);
