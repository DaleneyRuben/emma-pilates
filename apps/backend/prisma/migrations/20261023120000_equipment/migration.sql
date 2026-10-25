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

-- PostgreSQL invariants Prisma cannot express (BKO-004, ADR-0106).

-- Equipment -----------------------------------------------------------------

ALTER TABLE "back_office"."equipment"
  ADD CONSTRAINT "equipment_number_check" CHECK ("number" BETWEEN 1 AND 99);

-- A retired number may be registered again.
CREATE UNIQUE INDEX "equipment_branch_kind_active_number_key"
  ON "back_office"."equipment" ("branch_id", "kind", "number")
  WHERE "archived_at" IS NULL;

-- What a piece of Equipment is never changes; retiring it is final.
CREATE FUNCTION "back_office"."protect_equipment"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."branch_id" <> OLD."branch_id"
        OR NEW."kind" <> OLD."kind"
        OR NEW."number" <> OLD."number"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'equipment identity is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."archived_at" IS NOT NULL AND NEW."archived_at" IS DISTINCT FROM OLD."archived_at" THEN
        RAISE EXCEPTION 'equipment archival is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "equipment_protect"
    BEFORE UPDATE ON "back_office"."equipment"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."protect_equipment"();

CREATE TRIGGER "equipment_reject_delete"
    BEFORE DELETE ON "back_office"."equipment"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_history_delete"();

-- Equipment Issues ----------------------------------------------------------

ALTER TABLE "back_office"."equipment_issues"
  ADD CONSTRAINT "equipment_issues_values_check" CHECK (
    length(btrim("description")) BETWEEN 1 AND 500
    AND ("resolved_at" IS NULL) = ("resolved_by_account_id" IS NULL)
  );

-- Resolving is the only change, and it happens once.
CREATE FUNCTION "back_office"."protect_equipment_issue"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."equipment_id" <> OLD."equipment_id"
        OR NEW."description" <> OLD."description"
        OR NEW."out_of_service" <> OLD."out_of_service"
        OR NEW."reported_by_account_id" <> OLD."reported_by_account_id"
        OR NEW."reported_at" <> OLD."reported_at" THEN
        RAISE EXCEPTION 'equipment issue report is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."resolved_at" IS NOT NULL
        AND (NEW."resolved_at" IS DISTINCT FROM OLD."resolved_at"
            OR NEW."resolved_by_account_id" IS DISTINCT FROM OLD."resolved_by_account_id") THEN
        RAISE EXCEPTION 'equipment issue resolution is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "equipment_issues_protect"
    BEFORE UPDATE ON "back_office"."equipment_issues"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."protect_equipment_issue"();

CREATE TRIGGER "equipment_issues_reject_delete"
    BEFORE DELETE ON "back_office"."equipment_issues"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_history_delete"();
