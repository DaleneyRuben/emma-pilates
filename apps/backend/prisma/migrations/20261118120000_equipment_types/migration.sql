-- FIX-067: studio-defined Equipment Types (expand only). Every Equipment row
-- keeps its id, its Issues and its history; `kind` stays for old Staff app
-- builds and is left for a later contract step.

-- CreateEnum
CREATE TYPE "back_office"."EquipmentTracking" AS ENUM ('unit', 'quantity');

-- CreateTable
CREATE TABLE "back_office"."equipment_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tracking" "back_office"."EquipmentTracking" NOT NULL,
    "legacy_kind" "back_office"."EquipmentKind",
    "created_by_account_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "equipment_types_pkey" PRIMARY KEY ("id")
);

-- The three kinds become the first types, in their old order.
INSERT INTO "back_office"."equipment_types" ("id", "name", "tracking", "legacy_kind", "updated_at") VALUES
    (gen_random_uuid(), 'Reformer', 'unit', 'reformer', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Cadillac', 'unit', 'cadillac', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Mat', 'unit', 'mat', CURRENT_TIMESTAMP);

-- AlterTable: added nullable, backfilled from the kind, then required.
ALTER TABLE "back_office"."equipment" ADD COLUMN     "type_id" UUID,
ALTER COLUMN "kind" DROP NOT NULL;

UPDATE "back_office"."equipment" AS "equipment"
SET "type_id" = "type"."id"
FROM "back_office"."equipment_types" AS "type"
WHERE "type"."legacy_kind" = "equipment"."kind";

ALTER TABLE "back_office"."equipment" ALTER COLUMN "type_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "back_office"."equipment_issues" ADD COLUMN     "quantity" SMALLINT,
ADD COLUMN     "stock_id" UUID,
ADD COLUMN     "written_off" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "equipment_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "back_office"."equipment_stocks" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "equipment_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_types_legacy_kind_key" ON "back_office"."equipment_types"("legacy_kind");

-- CreateIndex
CREATE INDEX "equipment_types_created_by_account_id_idx" ON "back_office"."equipment_types"("created_by_account_id");

-- CreateIndex
CREATE INDEX "equipment_stocks_type_id_idx" ON "back_office"."equipment_stocks"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_stocks_branch_id_type_id_key" ON "back_office"."equipment_stocks"("branch_id", "type_id");

-- CreateIndex
CREATE INDEX "equipment_type_id_idx" ON "back_office"."equipment"("type_id");

-- CreateIndex
CREATE INDEX "equipment_issues_stock_id_resolved_at_idx" ON "back_office"."equipment_issues"("stock_id", "resolved_at");

-- AddForeignKey
ALTER TABLE "back_office"."equipment_types" ADD CONSTRAINT "equipment_types_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment" ADD CONSTRAINT "equipment_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "back_office"."equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment_stocks" ADD CONSTRAINT "equipment_stocks_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment_stocks" ADD CONSTRAINT "equipment_stocks_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "back_office"."equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_office"."equipment_issues" ADD CONSTRAINT "equipment_issues_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "back_office"."equipment_stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL invariants Prisma cannot express (FIX-067).

-- Equipment Types -----------------------------------------------------------

ALTER TABLE "back_office"."equipment_types"
  ADD CONSTRAINT "equipment_types_values_check" CHECK (
    "name" = btrim("name")
    AND length("name") BETWEEN 1 AND 40
    AND ("legacy_kind" IS NULL OR "tracking" = 'unit')
  );

-- A name is free again once its type is archived.
CREATE UNIQUE INDEX "equipment_types_active_name_key"
  ON "back_office"."equipment_types" (lower("name"))
  WHERE "archived_at" IS NULL;

-- Only the name changes; archiving is final.
CREATE FUNCTION "back_office"."protect_equipment_type"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."tracking" <> OLD."tracking"
        OR NEW."legacy_kind" IS DISTINCT FROM OLD."legacy_kind"
        OR NEW."created_by_account_id" IS DISTINCT FROM OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'equipment type identity is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."archived_at" IS NOT NULL AND NEW."archived_at" IS DISTINCT FROM OLD."archived_at" THEN
        RAISE EXCEPTION 'equipment type archival is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "equipment_types_protect"
    BEFORE UPDATE ON "back_office"."equipment_types"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."protect_equipment_type"();

CREATE TRIGGER "equipment_types_reject_delete"
    BEFORE DELETE ON "back_office"."equipment_types"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_history_delete"();

-- Equipment -----------------------------------------------------------------

DROP INDEX "back_office"."equipment_branch_kind_active_number_key";

-- A retired number may be registered again.
CREATE UNIQUE INDEX "equipment_branch_type_active_number_key"
  ON "back_office"."equipment" ("branch_id", "type_id", "number")
  WHERE "archived_at" IS NULL;

-- What a piece of Equipment is never changes; retiring it is final.
CREATE OR REPLACE FUNCTION "back_office"."protect_equipment"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."branch_id" <> OLD."branch_id"
        OR NEW."type_id" <> OLD."type_id"
        OR NEW."kind" IS DISTINCT FROM OLD."kind"
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

-- A numbered unit belongs to a unit type that is not archived; its kind is
-- that type's old kind (null for a studio type).
CREATE FUNCTION "back_office"."check_equipment_type"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    equipment_type RECORD;
BEGIN
    SELECT "tracking", "legacy_kind", "archived_at" INTO equipment_type
    FROM "back_office"."equipment_types"
    WHERE "id" = NEW."type_id";
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    IF equipment_type."tracking" <> 'unit' THEN
        RAISE EXCEPTION 'equipment needs a unit type' USING ERRCODE = '23514';
    END IF;
    IF equipment_type."archived_at" IS NOT NULL THEN
        RAISE EXCEPTION 'equipment type is archived' USING ERRCODE = '55000';
    END IF;
    IF NEW."kind" IS NULL THEN
        NEW."kind" := equipment_type."legacy_kind";
    ELSIF NEW."kind" IS DISTINCT FROM equipment_type."legacy_kind" THEN
        RAISE EXCEPTION 'equipment kind must match its type' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "equipment_check_type"
    BEFORE INSERT ON "back_office"."equipment"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."check_equipment_type"();

-- Equipment Stocks ----------------------------------------------------------

ALTER TABLE "back_office"."equipment_stocks"
  ADD CONSTRAINT "equipment_stocks_quantity_check" CHECK ("quantity" BETWEEN 0 AND 9999);

-- Only the quantity changes.
CREATE FUNCTION "back_office"."protect_equipment_stock"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."branch_id" <> OLD."branch_id"
        OR NEW."type_id" <> OLD."type_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'equipment stock identity is immutable' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "equipment_stocks_protect"
    BEFORE UPDATE ON "back_office"."equipment_stocks"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."protect_equipment_stock"();

-- A stock counts a quantity type.
CREATE FUNCTION "back_office"."check_equipment_stock_type"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "back_office"."equipment_types"
        WHERE "id" = NEW."type_id" AND "tracking" <> 'quantity'
    ) THEN
        RAISE EXCEPTION 'equipment stock needs a quantity type' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "equipment_stocks_check_type"
    BEFORE INSERT ON "back_office"."equipment_stocks"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."check_equipment_stock_type"();

CREATE TRIGGER "equipment_stocks_reject_delete"
    BEFORE DELETE ON "back_office"."equipment_stocks"
    FOR EACH ROW EXECUTE FUNCTION "back_office"."reject_history_delete"();

-- Equipment Issues ----------------------------------------------------------

-- A fault names one unit, or damage names a stock and how many; stock damage
-- never takes a unit out of service and is written off only when resolved.
ALTER TABLE "back_office"."equipment_issues"
  ADD CONSTRAINT "equipment_issues_target_check" CHECK (
    ("equipment_id" IS NULL) <> ("stock_id" IS NULL)
    AND ("stock_id" IS NULL) = ("quantity" IS NULL)
    AND ("quantity" IS NULL OR "quantity" BETWEEN 1 AND 9999)
    AND ("stock_id" IS NULL OR NOT "out_of_service")
    AND (NOT "written_off" OR ("stock_id" IS NOT NULL AND "resolved_at" IS NOT NULL))
  );

-- Resolving (and writing off) is the only change, and it happens once.
CREATE OR REPLACE FUNCTION "back_office"."protect_equipment_issue"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."equipment_id" IS DISTINCT FROM OLD."equipment_id"
        OR NEW."stock_id" IS DISTINCT FROM OLD."stock_id"
        OR NEW."quantity" IS DISTINCT FROM OLD."quantity"
        OR NEW."description" <> OLD."description"
        OR NEW."out_of_service" <> OLD."out_of_service"
        OR NEW."reported_by_account_id" <> OLD."reported_by_account_id"
        OR NEW."reported_at" <> OLD."reported_at" THEN
        RAISE EXCEPTION 'equipment issue report is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."resolved_at" IS NOT NULL
        AND (NEW."resolved_at" IS DISTINCT FROM OLD."resolved_at"
            OR NEW."resolved_by_account_id" IS DISTINCT FROM OLD."resolved_by_account_id"
            OR NEW."written_off" <> OLD."written_off") THEN
        RAISE EXCEPTION 'equipment issue resolution is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;
