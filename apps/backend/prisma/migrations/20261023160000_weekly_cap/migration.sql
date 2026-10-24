-- BKM-007, booking ADR-0006: a consumption adjustment names the Booking it
-- funded, so the weekly cap can count base-funded Bookings and leave out
-- the ones an extra class paid for. Nullable: a grant has no Booking.
-- Needs owner approval before any shared, staging, or production database.

ALTER TABLE "booking"."allowance_adjustments"
  ADD COLUMN "booking_id" UUID;

CREATE UNIQUE INDEX "allowance_adjustments_booking_id_key"
  ON "booking"."allowance_adjustments"("booking_id");

ALTER TABLE "booking"."allowance_adjustments"
  ADD CONSTRAINT "allowance_adjustments_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "booking"."bookings"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
