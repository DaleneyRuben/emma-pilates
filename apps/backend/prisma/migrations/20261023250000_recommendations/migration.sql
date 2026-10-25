-- STU-006: rules-based recommendations. A finding is rule + subject + period.
-- A removed row frees that key (ADR-0086). This schema has no foreign key
-- into another context (ADR-0011).

CREATE TABLE "studio"."recommendations" (
    "id" UUID NOT NULL,
    "rule" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "detail" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recommendations_rule_check" CHECK (
      "rule" IN ('weak_schedule', 'inactive_client')
    ),
    CONSTRAINT "recommendations_state_check" CHECK (
      "state" IN ('new', 'seen', 'dismissed', 'resolved')
    )
);

CREATE UNIQUE INDEX "recommendations_rule_subject_period_key"
  ON "studio"."recommendations" ("rule", "subject", "period")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "recommendations_period_idx"
  ON "studio"."recommendations" ("period");
