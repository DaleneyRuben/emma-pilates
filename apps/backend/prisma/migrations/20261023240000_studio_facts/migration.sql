-- STU-001: Studio Management facts. Identifiers copy Booking's; this schema
-- has no foreign key into another context (ADR-0011, ADR-0086).

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "studio";

-- CreateTable
CREATE TABLE "studio"."session_facts" (
    "session_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "branch_id" UUID NOT NULL,
    "class_type_id" UUID NOT NULL,
    "trainer_staff_member_id" UUID NOT NULL,
    "capacity" SMALLINT NOT NULL,
    "bookings_at_window_close" SMALLINT NOT NULL,
    "attended" SMALLINT NOT NULL,
    "no_shows" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "session_facts_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "studio"."client_month_facts" (
    "client_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "plan_days" SMALLINT NOT NULL,
    "classes_booked" SMALLINT NOT NULL,
    "classes_attended" SMALLINT NOT NULL,
    "renewed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "client_month_facts_pkey" PRIMARY KEY ("client_id","month")
);

-- CreateIndex
CREATE INDEX "session_facts_session_date_idx" ON "studio"."session_facts"("session_date");

-- CreateIndex
CREATE INDEX "client_month_facts_month_idx" ON "studio"."client_month_facts"("month");

ALTER TABLE "studio"."session_facts"
  ADD CONSTRAINT "session_facts_counts_check" CHECK (
    "capacity" >= 0
    AND "bookings_at_window_close" >= 0
    AND "attended" >= 0
    AND "no_shows" >= 0
    AND "attended" + "no_shows" <= "bookings_at_window_close"
  );

ALTER TABLE "studio"."client_month_facts"
  ADD CONSTRAINT "client_month_facts_counts_check" CHECK (
    "plan_days" >= 0
    AND "classes_booked" >= 0
    AND "classes_attended" >= 0
    AND "classes_attended" <= "classes_booked"
  );
