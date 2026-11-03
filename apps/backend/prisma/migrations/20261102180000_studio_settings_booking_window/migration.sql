-- FIX-026 (owner 2026-11-02): the Booking Window, «días para reservar por
-- adelantado», as a Studio Setting. A Client, or the Assistant for her, books,
-- joins a Waitlist, or reschedules only into a Session whose La Paz date falls
-- within that many days counting today. The owner's Session cancellation is not
-- limited by it. Every existing version reads 7, the window the apps showed.

-- AlterTable
ALTER TABLE "booking"."studio_settings_versions" ADD COLUMN     "booking_window_days" SMALLINT NOT NULL DEFAULT 7;

-- The Weekly Series publishes Sessions 30 days ahead, so a longer window opens
-- nothing more, and a window of zero days would close booking altogether.
ALTER TABLE "booking"."studio_settings_versions" ADD CONSTRAINT "studio_settings_versions_booking_window_days" CHECK ("booking_window_days" BETWEEN 1 AND 30);
