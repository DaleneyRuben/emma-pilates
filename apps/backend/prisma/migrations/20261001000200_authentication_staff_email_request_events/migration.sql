-- BE-013 T8: an event kind for an admitted staff-initiated authentication
-- email request, keyed by the signed-in Account
-- (docs/implementation/BE-013-staff-email-budgets-proposal.md).
-- AlterEnum
ALTER TYPE "system"."AuthenticationThrottleEventKind" ADD VALUE 'staff_email_requested';

-- AlterTable
ALTER TABLE "system"."authentication_throttle_events" ADD COLUMN     "account_id" UUID;

-- CreateIndex
CREATE INDEX "authentication_throttle_events_account_id_occurred_at_idx" ON "system"."authentication_throttle_events"("account_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "system"."authentication_throttle_events" ADD CONSTRAINT "authentication_throttle_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
