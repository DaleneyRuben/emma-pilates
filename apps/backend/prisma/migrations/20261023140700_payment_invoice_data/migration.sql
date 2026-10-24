-- PAY-007 / booking ADR-0012: the Invoice Data a sale may carry (a NIT or CI
-- and a name or business name, both or neither for «Sin factura») and the
-- Administrator's «Factura emitida» mark, who and when.

-- AlterTable
ALTER TABLE "booking"."payments" ADD COLUMN     "invoice_issued_at" TIMESTAMPTZ(3),
ADD COLUMN     "invoice_issued_by_account_id" UUID,
ADD COLUMN     "invoice_name" TEXT,
ADD COLUMN     "invoice_tax_id" TEXT;

-- CreateIndex
CREATE INDEX "payments_invoice_issued_by_account_id_idx" ON "booking"."payments"("invoice_issued_by_account_id");

-- AddForeignKey
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_invoice_issued_by_account_id_fkey" FOREIGN KEY ("invoice_issued_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Both identity fields or neither, trimmed and within the lengths the API accepts.
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_invoice_data_check" CHECK (
    ("invoice_tax_id" IS NULL AND "invoice_name" IS NULL)
    OR (
        "invoice_tax_id" IS NOT NULL AND "invoice_name" IS NOT NULL
        AND char_length("invoice_tax_id") BETWEEN 1 AND 20
        AND char_length("invoice_name") BETWEEN 1 AND 120
        AND "invoice_tax_id" = btrim("invoice_tax_id")
        AND "invoice_name" = btrim("invoice_name")
    )
);

-- The mark records who and when together.
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_invoice_issued_check" CHECK (
    ("invoice_issued_at" IS NULL) = ("invoice_issued_by_account_id" IS NULL)
);

-- Invoice Data is written with the sale and never rewritten; the only later
-- change is its erasure when the Client's Account closes (ADR-0097).
CREATE FUNCTION "booking"."protect_payment_invoice_data"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (NEW."invoice_tax_id" IS NOT NULL
            AND NEW."invoice_tax_id" IS DISTINCT FROM OLD."invoice_tax_id")
        OR (NEW."invoice_name" IS NOT NULL
            AND NEW."invoice_name" IS DISTINCT FROM OLD."invoice_name") THEN
        RAISE EXCEPTION 'payment invoice data is immutable' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "payments_protect_invoice_data"
    BEFORE UPDATE OF "invoice_tax_id", "invoice_name" ON "booking"."payments"
    FOR EACH ROW EXECUTE FUNCTION "booking"."protect_payment_invoice_data"();
