-- Review-only SQL for BKO-001: the Prisma-generated portion of the proposed
-- 20260924000000_back_office migration (prisma migrate diff from the migrated
-- schema to the merged models, with the drift-only DropForeignKey lines for
-- existing raw composite keys removed). The database-only protections follow
-- in back-office-constraints.sql. Not a migration; BKO-002 creates it only
-- after approval.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "back_office";


-- CreateTable
CREATE TABLE "back_office"."supplies" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "initial_quantity" INTEGER NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL,
    "low_stock_threshold" INTEGER NOT NULL,
    "created_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "back_office"."withdrawals" (
    "id" UUID NOT NULL,
    "supply_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "recorded_by_account_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "back_office"."supply_restocks" (
    "id" UUID NOT NULL,
    "supply_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "recorded_by_account_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_restocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "back_office"."salary_payments" (
    "id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "amount_centavos" INTEGER NOT NULL,
    "paid_on" DATE NOT NULL,
    "recorded_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "salary_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "back_office"."expense_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "back_office"."expenses" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "expense_category_id" UUID NOT NULL,
    "amount_centavos" INTEGER NOT NULL,
    "incurred_on" DATE NOT NULL,
    "recorded_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplies_branch_id_idx" ON "back_office"."supplies"("branch_id");

-- CreateIndex
CREATE INDEX "supplies_created_by_account_id_idx" ON "back_office"."supplies"("created_by_account_id");

-- CreateIndex
CREATE INDEX "withdrawals_supply_id_recorded_at_idx" ON "back_office"."withdrawals"("supply_id", "recorded_at");

-- CreateIndex
CREATE INDEX "withdrawals_recorded_at_idx" ON "back_office"."withdrawals"("recorded_at");

-- CreateIndex
CREATE INDEX "withdrawals_recorded_by_account_id_idx" ON "back_office"."withdrawals"("recorded_by_account_id");

-- CreateIndex
CREATE INDEX "supply_restocks_supply_id_recorded_at_idx" ON "back_office"."supply_restocks"("supply_id", "recorded_at");

-- CreateIndex
CREATE INDEX "supply_restocks_recorded_by_account_id_idx" ON "back_office"."supply_restocks"("recorded_by_account_id");

-- CreateIndex
CREATE INDEX "salary_payments_paid_on_idx" ON "back_office"."salary_payments"("paid_on");

-- CreateIndex
CREATE INDEX "salary_payments_staff_member_id_paid_on_idx" ON "back_office"."salary_payments"("staff_member_id", "paid_on");

-- CreateIndex
CREATE INDEX "salary_payments_recorded_by_account_id_idx" ON "back_office"."salary_payments"("recorded_by_account_id");

-- CreateIndex
CREATE INDEX "expenses_branch_id_incurred_on_idx" ON "back_office"."expenses"("branch_id", "incurred_on");

-- CreateIndex
CREATE INDEX "expenses_incurred_on_idx" ON "back_office"."expenses"("incurred_on");

-- CreateIndex
CREATE INDEX "expenses_expense_category_id_idx" ON "back_office"."expenses"("expense_category_id");

-- CreateIndex
CREATE INDEX "expenses_recorded_by_account_id_idx" ON "back_office"."expenses"("recorded_by_account_id");

-- AddForeignKey
ALTER TABLE "back_office"."supplies" ADD CONSTRAINT "supplies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."supplies" ADD CONSTRAINT "supplies_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."withdrawals" ADD CONSTRAINT "withdrawals_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "back_office"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."withdrawals" ADD CONSTRAINT "withdrawals_recorded_by_account_id_fkey" FOREIGN KEY ("recorded_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."supply_restocks" ADD CONSTRAINT "supply_restocks_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "back_office"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."supply_restocks" ADD CONSTRAINT "supply_restocks_recorded_by_account_id_fkey" FOREIGN KEY ("recorded_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."salary_payments" ADD CONSTRAINT "salary_payments_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."salary_payments" ADD CONSTRAINT "salary_payments_recorded_by_account_id_fkey" FOREIGN KEY ("recorded_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."expenses" ADD CONSTRAINT "expenses_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "back_office"."expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."expenses" ADD CONSTRAINT "expenses_recorded_by_account_id_fkey" FOREIGN KEY ("recorded_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
