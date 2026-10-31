-- REL-016: the Run Script record and the store-review mark. Expand-only.
--
-- Every run of a one-off script (script-runner-main, started from the Run
-- Script workflow as a Northflank job run) keeps a row: a script that
-- succeeded never runs again by accident, and each run links to its GitHub
-- run. Rows are soft-deleted only, like every other table.
CREATE TABLE "system"."script_runs" (
    "id" UUID NOT NULL,
    "script_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "run_url" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "script_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "script_runs_status_check"
        CHECK ("status" IN ('running', 'success', 'failure'))
);

CREATE INDEX "script_runs_script_name_started_at_idx"
    ON "system"."script_runs"("script_name", "started_at");

-- The Accounts Apple's and Google's reviewers sign in with. The reports'
-- store-review seam (real-plan-sale.ts) reads it in a later REL-016 step.
ALTER TABLE "system"."accounts"
    ADD COLUMN "store_review" BOOLEAN NOT NULL DEFAULT false;
