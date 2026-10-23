-- CreateEnum
CREATE TYPE "back_office"."EquipmentKind" AS ENUM ('reformer', 'cadillac', 'mat');

-- CreateTable
CREATE TABLE "back_office"."equipment" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "kind" "back_office"."EquipmentKind" NOT NULL,
    "number" SMALLINT NOT NULL,
    "created_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "back_office"."equipment_issues" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "out_of_service" BOOLEAN NOT NULL,
    "reported_by_account_id" UUID NOT NULL,
    "reported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by_account_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "equipment_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_branch_id_kind_idx" ON "back_office"."equipment"("branch_id", "kind");

-- CreateIndex
CREATE INDEX "equipment_created_by_account_id_idx" ON "back_office"."equipment"("created_by_account_id");

-- CreateIndex
CREATE INDEX "equipment_issues_equipment_id_resolved_at_idx" ON "back_office"."equipment_issues"("equipment_id", "resolved_at");

-- CreateIndex
CREATE INDEX "equipment_issues_reported_at_idx" ON "back_office"."equipment_issues"("reported_at");

-- CreateIndex
CREATE INDEX "equipment_issues_reported_by_account_id_idx" ON "back_office"."equipment_issues"("reported_by_account_id");

-- CreateIndex
CREATE INDEX "equipment_issues_resolved_by_account_id_idx" ON "back_office"."equipment_issues"("resolved_by_account_id");

-- AddForeignKey
ALTER TABLE "back_office"."equipment" ADD CONSTRAINT "equipment_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment" ADD CONSTRAINT "equipment_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment_issues" ADD CONSTRAINT "equipment_issues_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "back_office"."equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment_issues" ADD CONSTRAINT "equipment_issues_reported_by_account_id_fkey" FOREIGN KEY ("reported_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment_issues" ADD CONSTRAINT "equipment_issues_resolved_by_account_id_fkey" FOREIGN KEY ("resolved_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
