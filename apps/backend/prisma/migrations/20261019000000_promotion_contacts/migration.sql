-- BE-021: former Clients who agreed to keep receiving promotions when they
-- closed their Account (ADR-0097). No link to the closed Client or Account.

-- CreateTable
CREATE TABLE "booking"."promotion_contacts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "consented_at" TIMESTAMPTZ(3) NOT NULL,
    "withdrawn_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "promotion_contacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "promotion_contacts_withdrawal_check" CHECK ("withdrawn_at" IS NULL OR "withdrawn_at" >= "consented_at")
);

-- CreateIndex
CREATE INDEX "promotion_contacts_email_idx" ON "booking"."promotion_contacts"("email");
