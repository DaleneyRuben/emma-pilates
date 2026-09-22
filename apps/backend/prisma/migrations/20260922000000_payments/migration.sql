-- CreateEnum
CREATE TYPE "booking"."PurchaseIntentState" AS ENUM ('open', 'submitted', 'expired');

-- CreateEnum
CREATE TYPE "booking"."PaymentMethod" AS ENUM ('transfer', 'cash', 'credit_only');

-- CreateEnum
CREATE TYPE "booking"."PaymentState" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateEnum
CREATE TYPE "booking"."CreditLedgerEntryKind" AS ENUM ('referral_award', 'payment_reservation', 'payment_spend', 'payment_release');

-- CreateEnum
CREATE TYPE "booking"."CreditLedgerActorKind" AS ENUM ('account', 'worker');

-- CreateEnum
CREATE TYPE "booking"."CreditReservationState" AS ENUM ('reserved', 'spent', 'released');

-- CreateEnum
CREATE TYPE "booking"."ReferralState" AS ENUM ('pending', 'awarded');

-- AlterTable
ALTER TABLE "booking"."subscriptions" ADD COLUMN "payment_id" UUID;

-- CreateTable
CREATE TABLE "booking"."purchase_intents" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "plan_name_snapshot" TEXT NOT NULL,
    "duration_months_snapshot" SMALLINT NOT NULL,
    "class_allowance_snapshot" INTEGER NOT NULL,
    "plan_price_centavos" INTEGER NOT NULL,
    "credit_reserved_centavos" INTEGER NOT NULL,
    "amount_due_centavos" INTEGER NOT NULL,
    "receipt_image_asset_id" UUID,
    "state" "booking"."PurchaseIntentState" NOT NULL DEFAULT 'open',
    "created_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "expired_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "purchase_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."payments" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "purchase_intent_id" UUID,
    "plan_name_snapshot" TEXT NOT NULL,
    "duration_months_snapshot" SMALLINT NOT NULL,
    "class_allowance_snapshot" INTEGER NOT NULL,
    "plan_price_centavos" INTEGER NOT NULL,
    "credit_applied_centavos" INTEGER NOT NULL,
    "amount_due_centavos" INTEGER NOT NULL,
    "method" "booking"."PaymentMethod" NOT NULL,
    "state" "booking"."PaymentState" NOT NULL,
    "collected_at_branch_id" UUID,
    "submitted_by_account_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL,
    "decided_by_account_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."credit_reservations" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "amount_centavos" INTEGER NOT NULL,
    "purchase_intent_id" UUID,
    "payment_id" UUID,
    "state" "booking"."CreditReservationState" NOT NULL DEFAULT 'reserved',
    "reserved_at" TIMESTAMPTZ(3) NOT NULL,
    "settled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "credit_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."credit_ledger_entries" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "kind" "booking"."CreditLedgerEntryKind" NOT NULL,
    "amount_centavos" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservation_id" UUID,
    "referral_id" UUID,
    "actor_kind" "booking"."CreditLedgerActorKind" NOT NULL,
    "actor_account_id" UUID,
    "correlation_id" UUID NOT NULL,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking"."referrals" (
    "id" UUID NOT NULL,
    "referrer_client_id" UUID NOT NULL,
    "referred_client_id" UUID NOT NULL,
    "state" "booking"."ReferralState" NOT NULL DEFAULT 'pending',
    "qualified_payment_id" UUID,
    "qualified_at" TIMESTAMPTZ(3),
    "award_centavos" INTEGER,
    "awarded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intents_receipt_image_asset_id_key" ON "booking"."purchase_intents"("receipt_image_asset_id");

-- CreateIndex
CREATE INDEX "purchase_intents_state_expires_at_id_idx" ON "booking"."purchase_intents"("state", "expires_at", "id");

-- CreateIndex
CREATE INDEX "purchase_intents_plan_id_idx" ON "booking"."purchase_intents"("plan_id");

-- CreateIndex
CREATE INDEX "purchase_intents_created_by_account_id_idx" ON "booking"."purchase_intents"("created_by_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intents_id_client_id_key" ON "booking"."purchase_intents"("id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intents_id_client_id_plan_id_key" ON "booking"."purchase_intents"("id", "client_id", "plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_purchase_intent_id_key" ON "booking"."payments"("purchase_intent_id");

-- CreateIndex
CREATE INDEX "payments_client_id_state_submitted_at_id_idx" ON "booking"."payments"("client_id", "state", "submitted_at", "id");

-- CreateIndex
CREATE INDEX "payments_state_submitted_at_id_idx" ON "booking"."payments"("state", "submitted_at", "id");

-- CreateIndex
CREATE INDEX "payments_method_decided_at_id_idx" ON "booking"."payments"("method", "decided_at", "id");

-- CreateIndex
CREATE INDEX "payments_plan_id_idx" ON "booking"."payments"("plan_id");

-- CreateIndex
CREATE INDEX "payments_collected_at_branch_id_decided_at_idx" ON "booking"."payments"("collected_at_branch_id", "decided_at");

-- CreateIndex
CREATE INDEX "payments_decided_by_account_id_decided_at_idx" ON "booking"."payments"("decided_by_account_id", "decided_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_id_client_id_key" ON "booking"."payments"("id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_id_client_id_plan_id_key" ON "booking"."payments"("id", "client_id", "plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_reservations_purchase_intent_id_key" ON "booking"."credit_reservations"("purchase_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_reservations_payment_id_key" ON "booking"."credit_reservations"("payment_id");

-- CreateIndex
CREATE INDEX "credit_reservations_client_id_state_idx" ON "booking"."credit_reservations"("client_id", "state");

-- CreateIndex
CREATE INDEX "credit_reservations_state_reserved_at_id_idx" ON "booking"."credit_reservations"("state", "reserved_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_reservations_id_client_id_key" ON "booking"."credit_reservations"("id", "client_id");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_client_id_occurred_at_id_idx" ON "booking"."credit_ledger_entries"("client_id", "occurred_at", "id");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_reservation_id_idx" ON "booking"."credit_ledger_entries"("reservation_id");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_referral_id_idx" ON "booking"."credit_ledger_entries"("referral_id");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_actor_account_id_idx" ON "booking"."credit_ledger_entries"("actor_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_client_id_key" ON "booking"."referrals"("referred_client_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_qualified_payment_id_key" ON "booking"."referrals"("qualified_payment_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_client_id_created_at_id_idx" ON "booking"."referrals"("referrer_client_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_id_referrer_client_id_key" ON "booking"."referrals"("id", "referrer_client_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_payment_id_key" ON "booking"."subscriptions"("payment_id");

-- CreateIndex
CREATE INDEX "image_assets_state_deletion_due_at_idx" ON "system"."image_assets"("state", "deletion_due_at");

-- CreateIndex
CREATE INDEX "image_assets_state_delete_requested_at_idx" ON "system"."image_assets"("state", "delete_requested_at");

-- AddForeignKey
ALTER TABLE "booking"."subscriptions" ADD CONSTRAINT "subscriptions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "booking"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "booking"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_receipt_image_asset_id_fkey" FOREIGN KEY ("receipt_image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "booking"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_purchase_intent_id_fkey" FOREIGN KEY ("purchase_intent_id") REFERENCES "booking"."purchase_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_collected_at_branch_id_fkey" FOREIGN KEY ("collected_at_branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_submitted_by_account_id_fkey" FOREIGN KEY ("submitted_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_decided_by_account_id_fkey" FOREIGN KEY ("decided_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."credit_reservations" ADD CONSTRAINT "credit_reservations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."credit_reservations" ADD CONSTRAINT "credit_reservations_purchase_intent_id_fkey" FOREIGN KEY ("purchase_intent_id") REFERENCES "booking"."purchase_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."credit_reservations" ADD CONSTRAINT "credit_reservations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "booking"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "booking"."credit_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "booking"."referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."referrals" ADD CONSTRAINT "referrals_referrer_client_id_fkey" FOREIGN KEY ("referrer_client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."referrals" ADD CONSTRAINT "referrals_referred_client_id_fkey" FOREIGN KEY ("referred_client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."referrals" ADD CONSTRAINT "referrals_qualified_payment_id_fkey" FOREIGN KEY ("qualified_payment_id") REFERENCES "booking"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "system"."image_variants_image_asset_id_kind_visibility_delivery_version_" RENAME TO "image_variants_image_asset_id_kind_visibility_delivery_vers_key";

-- RenameIndex
ALTER INDEX "system"."image_variants_image_asset_id_visibility_delete_requested_at_id" RENAME TO "image_variants_image_asset_id_visibility_delete_requested_a_idx";

-- PostgreSQL invariants Prisma cannot express.

-- Ownership-preserving composite foreign keys.
ALTER TABLE "booking"."payments"
  ADD CONSTRAINT "payments_purchase_intent_same_client_plan_fkey"
    FOREIGN KEY ("purchase_intent_id", "client_id", "plan_id")
    REFERENCES "booking"."purchase_intents"("id", "client_id", "plan_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."subscriptions"
  ADD CONSTRAINT "subscriptions_payment_same_client_plan_fkey"
    FOREIGN KEY ("payment_id", "client_id", "plan_id")
    REFERENCES "booking"."payments"("id", "client_id", "plan_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."credit_reservations"
  ADD CONSTRAINT "credit_reservations_purchase_intent_same_client_fkey"
    FOREIGN KEY ("purchase_intent_id", "client_id")
    REFERENCES "booking"."purchase_intents"("id", "client_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "credit_reservations_payment_same_client_fkey"
    FOREIGN KEY ("payment_id", "client_id")
    REFERENCES "booking"."payments"("id", "client_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."credit_ledger_entries"
  ADD CONSTRAINT "credit_ledger_entries_reservation_same_client_fkey"
    FOREIGN KEY ("reservation_id", "client_id")
    REFERENCES "booking"."credit_reservations"("id", "client_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "credit_ledger_entries_referral_same_referrer_fkey"
    FOREIGN KEY ("referral_id", "client_id")
    REFERENCES "booking"."referrals"("id", "referrer_client_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."referrals"
  ADD CONSTRAINT "referrals_qualified_payment_same_referred_client_fkey"
    FOREIGN KEY ("qualified_payment_id", "referred_client_id")
    REFERENCES "booking"."payments"("id", "client_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row checks.
ALTER TABLE "booking"."purchase_intents"
  ADD CONSTRAINT "purchase_intents_snapshot_check" CHECK (
    btrim("plan_name_snapshot") <> ''
    AND "duration_months_snapshot" IN (1, 3, 6, 12)
    AND "class_allowance_snapshot" > 0
  ),
  ADD CONSTRAINT "purchase_intents_amounts_check" CHECK (
    "plan_price_centavos" > 0
    AND "credit_reserved_centavos" >= 0
    AND "amount_due_centavos" >= 0
    AND "credit_reserved_centavos" <= "plan_price_centavos"
    AND "amount_due_centavos" = "plan_price_centavos" - "credit_reserved_centavos"
  ),
  ADD CONSTRAINT "purchase_intents_time_check" CHECK ("expires_at" > "created_at"),
  ADD CONSTRAINT "purchase_intents_state_fields_check" CHECK (
    ("state" = 'open'
      AND "submitted_at" IS NULL
      AND "expired_at" IS NULL)
    OR ("state" = 'submitted'
      AND "submitted_at" IS NOT NULL
      AND "expired_at" IS NULL
      AND "receipt_image_asset_id" IS NOT NULL
      AND "submitted_at" >= "created_at")
    OR ("state" = 'expired'
      AND "submitted_at" IS NULL
      AND "expired_at" IS NOT NULL
      AND "expired_at" >= "created_at")
  );

ALTER TABLE "booking"."payments"
  ADD CONSTRAINT "payments_snapshot_check" CHECK (
    btrim("plan_name_snapshot") <> ''
    AND "duration_months_snapshot" IN (1, 3, 6, 12)
    AND "class_allowance_snapshot" > 0
  ),
  ADD CONSTRAINT "payments_amounts_check" CHECK (
    "plan_price_centavos" > 0
    AND "credit_applied_centavos" >= 0
    AND "amount_due_centavos" >= 0
    AND "credit_applied_centavos" <= "plan_price_centavos"
    AND "amount_due_centavos" = "plan_price_centavos" - "credit_applied_centavos"
  ),
  ADD CONSTRAINT "payments_method_fields_check" CHECK (
    ("method" = 'transfer'
      AND "purchase_intent_id" IS NOT NULL
      AND "collected_at_branch_id" IS NULL
      AND "amount_due_centavos" > 0)
    OR ("method" = 'cash'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NOT NULL
      AND "amount_due_centavos" > 0
      AND "state" = 'confirmed'
      AND "decided_by_account_id" = "submitted_by_account_id")
    OR ("method" = 'credit_only'
      AND "purchase_intent_id" IS NULL
      AND "collected_at_branch_id" IS NULL
      AND "amount_due_centavos" = 0
      AND "state" = 'confirmed'
      AND "decided_by_account_id" = "submitted_by_account_id")
  ),
  ADD CONSTRAINT "payments_state_fields_check" CHECK (
    ("state" = 'pending'
      AND "decided_by_account_id" IS NULL
      AND "decided_at" IS NULL
      AND "rejection_reason" IS NULL)
    OR ("state" = 'confirmed'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NULL
      AND "decided_at" >= "submitted_at")
    OR ("state" = 'rejected'
      AND "decided_by_account_id" IS NOT NULL
      AND "decided_at" IS NOT NULL
      AND "rejection_reason" IS NOT NULL
      AND char_length(btrim("rejection_reason")) BETWEEN 1 AND 300
      AND "rejection_reason" = btrim("rejection_reason")
      AND "decided_at" >= "submitted_at")
  );

ALTER TABLE "booking"."credit_reservations"
  ADD CONSTRAINT "credit_reservations_amount_check" CHECK ("amount_centavos" > 0),
  ADD CONSTRAINT "credit_reservations_source_check" CHECK (
    ("purchase_intent_id" IS NOT NULL) <> ("payment_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "credit_reservations_state_fields_check" CHECK (
    ("state" = 'reserved' AND "settled_at" IS NULL)
    OR ("state" IN ('spent', 'released')
      AND "settled_at" IS NOT NULL
      AND "settled_at" >= "reserved_at")
  );

ALTER TABLE "booking"."credit_ledger_entries"
  ADD CONSTRAINT "credit_ledger_entries_amount_check" CHECK ("amount_centavos" > 0),
  ADD CONSTRAINT "credit_ledger_entries_parent_check" CHECK (
    ("kind" = 'referral_award'
      AND "referral_id" IS NOT NULL
      AND "reservation_id" IS NULL)
    OR ("kind" IN ('payment_reservation', 'payment_spend', 'payment_release')
      AND "reservation_id" IS NOT NULL
      AND "referral_id" IS NULL)
  ),
  ADD CONSTRAINT "credit_ledger_entries_actor_check" CHECK (
    ("actor_kind" = 'account' AND "actor_account_id" IS NOT NULL)
    OR ("actor_kind" = 'worker' AND "actor_account_id" IS NULL)
  );

ALTER TABLE "booking"."referrals"
  ADD CONSTRAINT "referrals_no_self_reference_check" CHECK ("referrer_client_id" <> "referred_client_id"),
  ADD CONSTRAINT "referrals_state_fields_check" CHECK (
    ("state" = 'pending'
      AND "qualified_payment_id" IS NULL
      AND "qualified_at" IS NULL
      AND "award_centavos" IS NULL
      AND "awarded_at" IS NULL)
    OR ("state" = 'awarded'
      AND "qualified_payment_id" IS NOT NULL
      AND "qualified_at" IS NOT NULL
      AND "award_centavos" > 0
      AND "awarded_at" IS NOT NULL
      AND "qualified_at" >= "created_at"
      AND "awarded_at" >= "qualified_at")
  );

-- One open Purchase Intent and one pending Payment per Client.
CREATE UNIQUE INDEX "purchase_intents_one_open_per_client_key"
  ON "booking"."purchase_intents" ("client_id") WHERE "state" = 'open';
CREATE UNIQUE INDEX "payments_one_pending_per_client_key"
  ON "booking"."payments" ("client_id") WHERE "state" = 'pending';

-- Exactly one reservation entry and at most one terminal entry per Reservation;
-- one award entry per Referral.
CREATE UNIQUE INDEX "credit_ledger_entries_one_reservation_per_reservation_key"
  ON "booking"."credit_ledger_entries" ("reservation_id") WHERE "kind" = 'payment_reservation';
CREATE UNIQUE INDEX "credit_ledger_entries_one_settlement_per_reservation_key"
  ON "booking"."credit_ledger_entries" ("reservation_id") WHERE "kind" IN ('payment_spend', 'payment_release');
CREATE UNIQUE INDEX "credit_ledger_entries_one_award_per_referral_key"
  ON "booking"."credit_ledger_entries" ("referral_id") WHERE "kind" = 'referral_award';

-- Credit ledger is append-only, matching the audit_records protection.
CREATE FUNCTION "booking"."reject_credit_ledger_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'credit ledger entries are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "credit_ledger_entries_reject_update_or_delete"
    BEFORE UPDATE OR DELETE ON "booking"."credit_ledger_entries"
    FOR EACH ROW EXECUTE FUNCTION "booking"."reject_credit_ledger_mutation"();

CREATE TRIGGER "credit_ledger_entries_reject_truncate"
    BEFORE TRUNCATE ON "booking"."credit_ledger_entries"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_credit_ledger_mutation"();

-- Purchase Intent immutability: owner, Plan, snapshots, amounts, creator, and
-- lifetime never change; only the receipt (while open), the single terminal
-- transition, and updated_at may.
CREATE FUNCTION "booking"."protect_purchase_intent"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."plan_id" <> OLD."plan_id"
        OR NEW."plan_name_snapshot" <> OLD."plan_name_snapshot"
        OR NEW."duration_months_snapshot" <> OLD."duration_months_snapshot"
        OR NEW."class_allowance_snapshot" <> OLD."class_allowance_snapshot"
        OR NEW."plan_price_centavos" <> OLD."plan_price_centavos"
        OR NEW."credit_reserved_centavos" <> OLD."credit_reserved_centavos"
        OR NEW."amount_due_centavos" <> OLD."amount_due_centavos"
        OR NEW."created_by_account_id" <> OLD."created_by_account_id"
        OR NEW."created_at" <> OLD."created_at"
        OR NEW."expires_at" <> OLD."expires_at" THEN
        RAISE EXCEPTION 'purchase intent commercial fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" <> 'open' AND (
        NEW."state" <> OLD."state"
        OR NEW."submitted_at" IS DISTINCT FROM OLD."submitted_at"
        OR NEW."expired_at" IS DISTINCT FROM OLD."expired_at"
        OR NEW."receipt_image_asset_id" IS DISTINCT FROM OLD."receipt_image_asset_id") THEN
        RAISE EXCEPTION 'purchase intent is settled' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "purchase_intents_protect_update"
    BEFORE UPDATE ON "booking"."purchase_intents"
    FOR EACH ROW EXECUTE FUNCTION "booking"."protect_purchase_intent"();

CREATE TRIGGER "purchase_intents_reject_delete"
    BEFORE DELETE OR TRUNCATE ON "booking"."purchase_intents"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_credit_ledger_mutation"();

-- Payment immutability: only the pending transfer decision and updated_at may change.
CREATE FUNCTION "booking"."protect_payment"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."client_id" <> OLD."client_id"
        OR NEW."plan_id" <> OLD."plan_id"
        OR NEW."purchase_intent_id" IS DISTINCT FROM OLD."purchase_intent_id"
        OR NEW."plan_name_snapshot" <> OLD."plan_name_snapshot"
        OR NEW."duration_months_snapshot" <> OLD."duration_months_snapshot"
        OR NEW."class_allowance_snapshot" <> OLD."class_allowance_snapshot"
        OR NEW."plan_price_centavos" <> OLD."plan_price_centavos"
        OR NEW."credit_applied_centavos" <> OLD."credit_applied_centavos"
        OR NEW."amount_due_centavos" <> OLD."amount_due_centavos"
        OR NEW."method" <> OLD."method"
        OR NEW."collected_at_branch_id" IS DISTINCT FROM OLD."collected_at_branch_id"
        OR NEW."submitted_by_account_id" <> OLD."submitted_by_account_id"
        OR NEW."submitted_at" <> OLD."submitted_at"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'payment commercial fields are immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" <> 'pending' AND (
        NEW."state" <> OLD."state"
        OR NEW."decided_by_account_id" IS DISTINCT FROM OLD."decided_by_account_id"
        OR NEW."decided_at" IS DISTINCT FROM OLD."decided_at"
        OR NEW."rejection_reason" IS DISTINCT FROM OLD."rejection_reason") THEN
        RAISE EXCEPTION 'payment decision is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "payments_protect_update"
    BEFORE UPDATE ON "booking"."payments"
    FOR EACH ROW EXECUTE FUNCTION "booking"."protect_payment"();

CREATE TRIGGER "payments_reject_delete"
    BEFORE DELETE OR TRUNCATE ON "booking"."payments"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_credit_ledger_mutation"();

-- Referral attribution is immutable; award evidence is written once.
CREATE FUNCTION "booking"."protect_referral"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."referrer_client_id" <> OLD."referrer_client_id"
        OR NEW."referred_client_id" <> OLD."referred_client_id"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'referral attribution is immutable' USING ERRCODE = '55000';
    END IF;
    IF OLD."state" = 'awarded' AND (
        NEW."state" <> OLD."state"
        OR NEW."qualified_payment_id" IS DISTINCT FROM OLD."qualified_payment_id"
        OR NEW."qualified_at" IS DISTINCT FROM OLD."qualified_at"
        OR NEW."award_centavos" IS DISTINCT FROM OLD."award_centavos"
        OR NEW."awarded_at" IS DISTINCT FROM OLD."awarded_at") THEN
        RAISE EXCEPTION 'referral award is final' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "referrals_protect_update"
    BEFORE UPDATE ON "booking"."referrals"
    FOR EACH ROW EXECUTE FUNCTION "booking"."protect_referral"();

CREATE TRIGGER "referrals_reject_delete"
    BEFORE DELETE OR TRUNCATE ON "booking"."referrals"
    FOR EACH STATEMENT EXECUTE FUNCTION "booking"."reject_credit_ledger_mutation"();

-- Deferred cross-row integrity, evaluated at commit. The functions inspect
-- identifiers, states, kinds, ownership, and amounts only.

-- 1. Confirmed Payment <-> exactly one Subscription.
CREATE FUNCTION "booking"."assert_payment_subscription_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_payment_id UUID;
    payment_state "booking"."PaymentState";
    subscription_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'payments' THEN
        target_payment_id := NEW."id";
    ELSE
        target_payment_id := NEW."payment_id";
        IF target_payment_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state" INTO payment_state FROM "booking"."payments" WHERE "id" = target_payment_id;
    SELECT count(*) INTO subscription_count FROM "booking"."subscriptions" WHERE "payment_id" = target_payment_id;

    IF payment_state = 'confirmed' AND subscription_count <> 1 THEN
        RAISE EXCEPTION 'confirmed payment % must have exactly one subscription', target_payment_id USING ERRCODE = '23514';
    END IF;
    IF payment_state <> 'confirmed' AND subscription_count <> 0 THEN
        RAISE EXCEPTION 'payment % is not confirmed and cannot have a subscription', target_payment_id USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "payments_subscription_consistency"
    AFTER INSERT OR UPDATE ON "booking"."payments"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_payment_subscription_consistency"();

CREATE CONSTRAINT TRIGGER "subscriptions_payment_consistency"
    AFTER INSERT OR UPDATE OF "payment_id" ON "booking"."subscriptions"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_payment_subscription_consistency"();

-- 2. Submitted Purchase Intent <-> exactly one transfer Payment.
CREATE FUNCTION "booking"."assert_purchase_intent_payment_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    intent_id UUID;
    intent_state "booking"."PurchaseIntentState";
    payment_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'purchase_intents' THEN
        intent_id := NEW."id";
    ELSE
        intent_id := NEW."purchase_intent_id";
        IF intent_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state" INTO intent_state FROM "booking"."purchase_intents" WHERE "id" = intent_id;
    SELECT count(*) INTO payment_count
      FROM "booking"."payments"
      WHERE "purchase_intent_id" = intent_id AND "method" = 'transfer';

    IF intent_state = 'submitted' AND payment_count <> 1 THEN
        RAISE EXCEPTION 'submitted purchase intent % must have exactly one transfer payment', intent_id USING ERRCODE = '23514';
    END IF;
    IF intent_state <> 'submitted' AND payment_count <> 0 THEN
        RAISE EXCEPTION 'purchase intent % is not submitted and cannot have a payment', intent_id USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "purchase_intents_payment_consistency"
    AFTER INSERT OR UPDATE ON "booking"."purchase_intents"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_purchase_intent_payment_consistency"();

CREATE CONSTRAINT TRIGGER "payments_purchase_intent_consistency"
    AFTER INSERT OR UPDATE ON "booking"."payments"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_purchase_intent_payment_consistency"();

-- 3. Reservation <-> ledger entries (one reservation entry; one matching terminal entry once settled).
CREATE FUNCTION "booking"."assert_credit_reservation_ledger_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_reservation_id UUID;
    reservation RECORD;
    reservation_entries INTEGER;
    spend_entries INTEGER;
    release_entries INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'credit_reservations' THEN
        target_reservation_id := NEW."id";
    ELSE
        target_reservation_id := NEW."reservation_id";
        IF target_reservation_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state", "amount_centavos", "client_id" INTO reservation
      FROM "booking"."credit_reservations" WHERE "id" = target_reservation_id;

    SELECT count(*) INTO reservation_entries FROM "booking"."credit_ledger_entries"
      WHERE "reservation_id" = target_reservation_id AND "kind" = 'payment_reservation'
        AND "amount_centavos" = reservation."amount_centavos" AND "client_id" = reservation."client_id";
    SELECT count(*) INTO spend_entries FROM "booking"."credit_ledger_entries"
      WHERE "reservation_id" = target_reservation_id AND "kind" = 'payment_spend'
        AND "amount_centavos" = reservation."amount_centavos" AND "client_id" = reservation."client_id";
    SELECT count(*) INTO release_entries FROM "booking"."credit_ledger_entries"
      WHERE "reservation_id" = target_reservation_id AND "kind" = 'payment_release'
        AND "amount_centavos" = reservation."amount_centavos" AND "client_id" = reservation."client_id";

    IF reservation_entries <> 1 THEN
        RAISE EXCEPTION 'credit reservation % must have exactly one matching reservation entry', target_reservation_id USING ERRCODE = '23514';
    END IF;
    IF reservation."state" = 'reserved' AND (spend_entries + release_entries) <> 0 THEN
        RAISE EXCEPTION 'reserved credit reservation % cannot have a settlement entry', target_reservation_id USING ERRCODE = '23514';
    END IF;
    IF reservation."state" = 'spent' AND NOT (spend_entries = 1 AND release_entries = 0) THEN
        RAISE EXCEPTION 'spent credit reservation % must have exactly one matching spend entry', target_reservation_id USING ERRCODE = '23514';
    END IF;
    IF reservation."state" = 'released' AND NOT (release_entries = 1 AND spend_entries = 0) THEN
        RAISE EXCEPTION 'released credit reservation % must have exactly one matching release entry', target_reservation_id USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "credit_reservations_ledger_consistency"
    AFTER INSERT OR UPDATE ON "booking"."credit_reservations"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_credit_reservation_ledger_consistency"();

CREATE CONSTRAINT TRIGGER "credit_ledger_entries_reservation_consistency"
    AFTER INSERT ON "booking"."credit_ledger_entries"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_credit_reservation_ledger_consistency"();

-- 4. Awarded Referral <-> confirmed Payment of the referred Client and one award entry for the referrer.
CREATE FUNCTION "booking"."assert_referral_award_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_referral_id UUID;
    referral RECORD;
    payment RECORD;
    award_entries INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'referrals' THEN
        target_referral_id := NEW."id";
    ELSE
        target_referral_id := NEW."referral_id";
        IF target_referral_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state", "referrer_client_id", "referred_client_id", "qualified_payment_id", "award_centavos"
      INTO referral FROM "booking"."referrals" WHERE "id" = target_referral_id;

    SELECT count(*) INTO award_entries FROM "booking"."credit_ledger_entries"
      WHERE "referral_id" = target_referral_id AND "kind" = 'referral_award'
        AND "client_id" = referral."referrer_client_id"
        AND "amount_centavos" = referral."award_centavos";

    IF referral."state" = 'pending' THEN
        IF award_entries <> 0 THEN
            RAISE EXCEPTION 'pending referral % cannot have an award entry', target_referral_id USING ERRCODE = '23514';
        END IF;
        RETURN NULL;
    END IF;

    SELECT "state", "client_id" INTO payment FROM "booking"."payments" WHERE "id" = referral."qualified_payment_id";
    IF payment."state" IS DISTINCT FROM 'confirmed' OR payment."client_id" <> referral."referred_client_id" THEN
        RAISE EXCEPTION 'awarded referral % requires a confirmed payment of the referred client', target_referral_id USING ERRCODE = '23514';
    END IF;
    IF award_entries <> 1 THEN
        RAISE EXCEPTION 'awarded referral % must have exactly one matching award entry', target_referral_id USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "referrals_award_consistency"
    AFTER INSERT OR UPDATE ON "booking"."referrals"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_referral_award_consistency"();

CREATE CONSTRAINT TRIGGER "credit_ledger_entries_referral_consistency"
    AFTER INSERT ON "booking"."credit_ledger_entries"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_referral_award_consistency"();

-- Defensive: a Payment that qualifies a Referral must stay confirmed.
CREATE FUNCTION "booking"."assert_payment_referral_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."state" <> 'confirmed'
       AND EXISTS (SELECT 1 FROM "booking"."referrals" WHERE "qualified_payment_id" = NEW."id") THEN
        RAISE EXCEPTION 'payment % qualifies a referral and must stay confirmed', NEW."id" USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "payments_referral_consistency"
    AFTER UPDATE OF "state" ON "booking"."payments"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_payment_referral_consistency"();
