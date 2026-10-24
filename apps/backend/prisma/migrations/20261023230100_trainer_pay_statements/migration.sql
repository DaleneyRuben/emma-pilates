-- BKO-006: Trainer pay rates and monthly statements. Needs owner approval
-- before any shared, staging, or production database.

CREATE TYPE "back_office"."PayStatementState" AS ENUM ('draft', 'approved');

CREATE TYPE "back_office"."PayStatementLineKind" AS ENUM ('class', 'minimum_not_met', 'commission');

CREATE TABLE "back_office"."pay_rate_rules" (
    "id" UUID NOT NULL,
    "class_centavos" INTEGER NOT NULL,
    "included_students" SMALLINT NOT NULL,
    "extra_student_centavos" INTEGER NOT NULL,
    "minimum_not_met_centavos" INTEGER NOT NULL,
    "commission_percent" SMALLINT NOT NULL,
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pay_rate_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pay_rate_rules_effective_from_key" ON "back_office"."pay_rate_rules"("effective_from");

CREATE TABLE "back_office"."pay_statements" (
    "id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "state" "back_office"."PayStatementState" NOT NULL DEFAULT 'draft',
    "total_centavos" INTEGER NOT NULL,
    "salary_payment_id" UUID,
    "approved_by_account_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "pay_statements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pay_statements_salary_payment_id_key" ON "back_office"."pay_statements"("salary_payment_id");

CREATE INDEX "pay_statements_staff_member_id_month_idx" ON "back_office"."pay_statements"("staff_member_id", "month");

CREATE INDEX "pay_statements_month_state_idx" ON "back_office"."pay_statements"("month", "state");

CREATE INDEX "pay_statements_approved_by_account_id_idx" ON "back_office"."pay_statements"("approved_by_account_id");

-- One live statement per Trainer per month (ADR-0086).
CREATE UNIQUE INDEX "pay_statements_staff_member_month_live_key"
    ON "back_office"."pay_statements"("staff_member_id", "month")
    WHERE "deleted_at" IS NULL;

CREATE TABLE "back_office"."pay_statement_lines" (
    "id" UUID NOT NULL,
    "pay_statement_id" UUID NOT NULL,
    "kind" "back_office"."PayStatementLineKind" NOT NULL,
    "detail" TEXT NOT NULL,
    "amount_centavos" INTEGER NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "pay_statement_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pay_statement_lines_pay_statement_id_position_idx" ON "back_office"."pay_statement_lines"("pay_statement_id", "position");

ALTER TABLE "back_office"."pay_statements" ADD CONSTRAINT "pay_statements_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "back_office"."pay_statements" ADD CONSTRAINT "pay_statements_salary_payment_id_fkey" FOREIGN KEY ("salary_payment_id") REFERENCES "back_office"."salary_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "back_office"."pay_statements" ADD CONSTRAINT "pay_statements_approved_by_account_id_fkey" FOREIGN KEY ("approved_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "back_office"."pay_statement_lines" ADD CONSTRAINT "pay_statement_lines_pay_statement_id_fkey" FOREIGN KEY ("pay_statement_id") REFERENCES "back_office"."pay_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Opening rates (decisions section 8), in force from the first day the
-- statement can be drafted.
INSERT INTO "back_office"."pay_rate_rules" (
    "id",
    "class_centavos",
    "included_students",
    "extra_student_centavos",
    "minimum_not_met_centavos",
    "commission_percent",
    "effective_from"
) VALUES (
    '01910000-0006-7000-8000-000000000001',
    6500,
    4,
    800,
    2500,
    10,
    DATE '2026-01-01'
);
