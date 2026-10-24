-- BKM-009 / booking ADR-0007: the Minimum Bookings check cancels a Session
-- below the minimum with its own cause, and every Session records how many
-- live Bookings it held when its Cancellation Window closed.

-- AlterEnum
ALTER TYPE "booking"."SessionCancellationCause" ADD VALUE 'minimum_not_met';

-- AlterTable
ALTER TABLE "booking"."sessions" ADD COLUMN "bookings_at_window_close" SMALLINT;

ALTER TABLE "booking"."sessions" ADD CONSTRAINT "sessions_bookings_at_window_close_non_negative" CHECK ("bookings_at_window_close" IS NULL OR "bookings_at_window_close" >= 0);
