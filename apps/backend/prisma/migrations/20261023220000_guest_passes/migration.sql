-- BKM-014, decisions §5.3: a Guest Pass is one free class in a friend's
-- life. The row links the host, the friend, the hidden courtesy
-- Subscription, the Booking once she spends it, and the host's reward once
-- it lands. A removal is deleted_at (ADR-0086), so the uniqueness that a
-- removed row must not block is partial.

-- CreateTable
CREATE TABLE "booking"."guest_passes" (
    "id" UUID NOT NULL,
    "host_client_id" UUID NOT NULL,
    "friend_client_id" UUID NOT NULL,
    "courtesy_subscription_id" UUID NOT NULL,
    "booking_id" UUID,
    "reward_subscription_id" UUID,
    "rewarded_at" TIMESTAMPTZ(3),
    "reward_owed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "guest_passes_pkey" PRIMARY KEY ("id")
);

-- One courtesy Subscription funds exactly one pass.
CREATE UNIQUE INDEX "guest_passes_courtesy_subscription_id_key" ON "booking"."guest_passes"("courtesy_subscription_id");

-- CreateIndex
CREATE INDEX "guest_passes_host_client_id_created_at_idx" ON "booking"."guest_passes"("host_client_id", "created_at");

-- A second live Guest Pass for the same friend is refused.
CREATE UNIQUE INDEX "guest_passes_friend_live_key" ON "booking"."guest_passes"("friend_client_id") WHERE "deleted_at" IS NULL;

-- One live Booking spends one pass.
CREATE UNIQUE INDEX "guest_passes_booking_live_key" ON "booking"."guest_passes"("booking_id") WHERE "booking_id" IS NOT NULL AND "deleted_at" IS NULL;

-- A retried confirmation grants the host nothing more.
CREATE UNIQUE INDEX "guest_passes_one_reward_per_friend" ON "booking"."guest_passes"("friend_client_id") WHERE "rewarded_at" IS NOT NULL AND "deleted_at" IS NULL;

-- A host cannot invite herself, and a reward names its moment.
ALTER TABLE "booking"."guest_passes"
  ADD CONSTRAINT "guest_passes_not_self_check" CHECK ("host_client_id" <> "friend_client_id"),
  ADD CONSTRAINT "guest_passes_reward_check" CHECK (
    ("rewarded_at" IS NULL AND "reward_subscription_id" IS NULL)
    OR ("rewarded_at" IS NOT NULL AND "reward_subscription_id" IS NOT NULL AND "reward_owed" = false)
  );

-- AddForeignKey
ALTER TABLE "booking"."guest_passes" ADD CONSTRAINT "guest_passes_host_client_id_fkey" FOREIGN KEY ("host_client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."guest_passes" ADD CONSTRAINT "guest_passes_friend_client_id_fkey" FOREIGN KEY ("friend_client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."guest_passes" ADD CONSTRAINT "guest_passes_courtesy_subscription_id_fkey" FOREIGN KEY ("courtesy_subscription_id") REFERENCES "booking"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."guest_passes" ADD CONSTRAINT "guest_passes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."guest_passes" ADD CONSTRAINT "guest_passes_reward_subscription_id_fkey" FOREIGN KEY ("reward_subscription_id") REFERENCES "booking"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
