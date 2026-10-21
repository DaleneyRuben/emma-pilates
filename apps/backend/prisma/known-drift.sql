-- EXT-019: the drift `prisma migrate diff` reports between the applied migrations
-- and prisma/models, kept on purpose. Each constraint is a composite foreign key
-- written as raw SQL in a migration because Prisma cannot model it; the schema
-- models the plain keys only. .github/scripts/check-migrations.sh fails on any
-- other line. A new raw constraint is added here, with its reason, in the same
-- pull request as its migration.

-- DropForeignKey
ALTER TABLE "booking"."bookings" DROP CONSTRAINT "bookings_reschedule_same_client_subscription_fkey";

-- DropForeignKey
ALTER TABLE "booking"."bookings" DROP CONSTRAINT "bookings_subscription_client_fkey";

-- DropForeignKey
ALTER TABLE "booking"."credit_ledger_entries" DROP CONSTRAINT "credit_ledger_entries_referral_same_referrer_fkey";

-- DropForeignKey
ALTER TABLE "booking"."credit_ledger_entries" DROP CONSTRAINT "credit_ledger_entries_reservation_same_client_fkey";

-- DropForeignKey
ALTER TABLE "booking"."credit_reservations" DROP CONSTRAINT "credit_reservations_payment_same_client_fkey";

-- DropForeignKey
ALTER TABLE "booking"."credit_reservations" DROP CONSTRAINT "credit_reservations_purchase_intent_same_client_fkey";

-- DropForeignKey
ALTER TABLE "booking"."payments" DROP CONSTRAINT "payments_purchase_intent_same_client_plan_fkey";

-- DropForeignKey
ALTER TABLE "booking"."referrals" DROP CONSTRAINT "referrals_qualified_payment_same_referred_client_fkey";

-- DropForeignKey
ALTER TABLE "booking"."subscriptions" DROP CONSTRAINT "subscriptions_payment_same_client_plan_fkey";

-- DropForeignKey
ALTER TABLE "booking"."waitlist_entries" DROP CONSTRAINT "waitlist_entries_promoted_booking_same_client_session_fkey";

