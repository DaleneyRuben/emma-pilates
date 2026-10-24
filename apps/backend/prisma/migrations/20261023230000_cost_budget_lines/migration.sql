-- BKO-005: the fixed-cost budget. Needs owner approval before any shared,
-- staging, or production database.
CREATE TABLE "back_office"."cost_budget_lines" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "monthly_centavos" INTEGER NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cost_budget_lines_pkey" PRIMARY KEY ("id")
);
