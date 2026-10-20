-- BE-023: a live Client's Promotions Consent, one row per period from when
-- they agree in Perfil to when they stop or close their Account (ADR-0098).

-- CreateTable
CREATE TABLE "booking"."client_promotions_consents" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "consented_at" TIMESTAMPTZ(3) NOT NULL,
    "withdrawn_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "client_promotions_consents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_promotions_consents_withdrawal_check" CHECK ("withdrawn_at" IS NULL OR "withdrawn_at" >= "consented_at")
);

-- CreateIndex
CREATE INDEX "client_promotions_consents_client_id_idx" ON "booking"."client_promotions_consents"("client_id");

-- One open consent per Client, among live rows only (ADR-0086).
CREATE UNIQUE INDEX "client_promotions_consents_open_key" ON "booking"."client_promotions_consents"("client_id") WHERE "withdrawn_at" IS NULL AND "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "booking"."client_promotions_consents" ADD CONSTRAINT "client_promotions_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
