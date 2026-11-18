-- Walkthrough finding 107 (owner approved option A, 2026-11-18): Sessions
-- cancelled automatically for low demand, so a weak schedule and the month
-- question can count them. Additive; filled by the studio facts recompute.

-- CreateTable
CREATE TABLE "studio"."cancelled_session_facts" (
    "session_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "branch_id" UUID NOT NULL,
    "class_type_id" UUID NOT NULL,
    "trainer_staff_member_id" UUID NOT NULL,
    "cause" TEXT NOT NULL,
    "bookings_held" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "cancelled_session_facts_pkey" PRIMARY KEY ("session_id")
);

-- CreateIndex
CREATE INDEX "cancelled_session_facts_session_date_idx" ON "studio"."cancelled_session_facts"("session_date");

ALTER TABLE "studio"."cancelled_session_facts"
  ADD CONSTRAINT "cancelled_session_facts_values_check" CHECK (
    "cause" IN ('minimum_not_met', 'zero_bookings')
    AND "bookings_held" >= 0
  );
