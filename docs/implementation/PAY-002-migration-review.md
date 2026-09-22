# PAY-002 — Payment persistence migration review

Status: **awaiting approval**. This package turns the approved
[PAY-001 proposal](./PAY-001-payment-schema-proposal.md) (approved 2026-09-11)
into the exact Prisma model text and migration SQL that PAY-002 would add. It
follows the format of the [BKM-001](./BKM-001-schema-review-package.md) and
[BOOK-001](./BOOK-001-schema-review-package.md) review packages.

## Scope and what this does not authorize

This document authorizes nothing by itself. Until the user answers the
[decisions below](#decisions-required-before-approval) and says yes:

- no file under `apps/backend/prisma/migrations/` is created;
- no Prisma model under `apps/backend/prisma/models/` changes;
- no migration is applied to any database, including the normal local
  development database `emma_pilates`;
- no PAY-002 command, endpoint, or generated contract is implemented.

After approval, the migration is created exactly as reviewed here (with the
approved decision options folded in), validated only against a disposable
`pilates_test_*` PostgreSQL database, and committed together with its Prisma
models. Normal development and production databases remain separately
authorized targets.

## Concrete schema impact

| Object                            | Change                                                                                   | Why it is required                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `PurchaseIntentState`             | `open`, `submitted`, `expired`                                                           | One resumable pre-transfer record with exactly one terminal transition.            |
| `PaymentMethod`                   | `transfer`, `cash`, `credit_only`                                                        | Three approved ways to pay; Credit-only avoids a Bs 0 receipt.                     |
| `PaymentState`                    | `pending`, `confirmed`, `rejected`                                                       | Transfer review lifecycle; cash and Credit-only are created confirmed.             |
| `CreditLedgerEntryKind`           | `referral_award`, `payment_reservation`, `payment_spend`, `payment_release`              | Immutable Credit events; the ledger is the only balance source.                    |
| `CreditLedgerActorKind`           | `account`, `worker`                                                                      | Provenance without copying request or personal data.                              |
| `CreditReservationState`          | `reserved`, `spent`, `released`                                                          | One conditional transition per reservation.                                        |
| `ReferralState`                   | `pending`, `awarded`                                                                     | Award exactly once on the referred Client's first confirmed Payment.               |
| `booking.purchase_intents`        | new table                                                                                | Frozen Plan snapshot, Credit reservation, amount due, and attached receipt.        |
| `booking.payments`                | new table                                                                                | Financial record for transfer, cash, and Credit-only purchases.                    |
| `booking.credit_reservations`     | new table                                                                                | Positive Credit amount bound to one Intent or one immediate Payment.               |
| `booking.credit_ledger_entries`   | new append-only table                                                                    | Award, reservation, spend, and release events.                                     |
| `booking.referrals`               | new table                                                                                | Immutable signup attribution plus award evidence.                                  |
| `booking.subscriptions`           | new `payment_id` column, unique, restrictive FK, composite ownership FK                  | A Subscription is created only by confirming a Payment (see decision (a)).         |

There are no drops, no changes to `system.*` tables, no notification or job
tables, no seeds, and no modifications under `design/`.

## Prisma model text

The fragment below is merged into `apps/backend/prisma/models/booking-catalog.prisma`
(enums, `PurchaseIntent`, `Payment`, `CreditReservation`, `CreditLedgerEntry`,
`Referral`, and the `Subscription` amendment) with reverse fields added to the
existing models listed after it.

```prisma
enum PurchaseIntentState {
  OPEN      @map("open")
  SUBMITTED @map("submitted")
  EXPIRED   @map("expired")

  @@schema("booking")
}

enum PaymentMethod {
  TRANSFER    @map("transfer")
  CASH        @map("cash")
  CREDIT_ONLY @map("credit_only")

  @@schema("booking")
}

enum PaymentState {
  PENDING   @map("pending")
  CONFIRMED @map("confirmed")
  REJECTED  @map("rejected")

  @@schema("booking")
}

enum CreditLedgerEntryKind {
  REFERRAL_AWARD      @map("referral_award")
  PAYMENT_RESERVATION @map("payment_reservation")
  PAYMENT_SPEND       @map("payment_spend")
  PAYMENT_RELEASE     @map("payment_release")

  @@schema("booking")
}

enum CreditLedgerActorKind {
  ACCOUNT @map("account")
  WORKER  @map("worker")

  @@schema("booking")
}

enum CreditReservationState {
  RESERVED @map("reserved")
  SPENT    @map("spent")
  RELEASED @map("released")

  @@schema("booking")
}

enum ReferralState {
  PENDING @map("pending")
  AWARDED @map("awarded")

  @@schema("booking")
}

model PurchaseIntent {
  id                     String              @id @default(uuid()) @db.Uuid
  clientId               String              @map("client_id") @db.Uuid
  planId                 String              @map("plan_id") @db.Uuid
  planNameSnapshot       String              @map("plan_name_snapshot")
  durationMonthsSnapshot Int                 @map("duration_months_snapshot") @db.SmallInt
  classAllowanceSnapshot Int                 @map("class_allowance_snapshot")
  planPriceCentavos      Int                 @map("plan_price_centavos")
  creditReservedCentavos Int                 @map("credit_reserved_centavos")
  amountDueCentavos      Int                 @map("amount_due_centavos")
  receiptImageAssetId    String?             @unique @map("receipt_image_asset_id") @db.Uuid
  state                  PurchaseIntentState @default(OPEN)
  createdByAccountId     String              @map("created_by_account_id") @db.Uuid
  createdAt              DateTime            @default(now()) @map("created_at") @db.Timestamptz(3)
  expiresAt              DateTime            @map("expires_at") @db.Timestamptz(3)
  submittedAt            DateTime?           @map("submitted_at") @db.Timestamptz(3)
  expiredAt              DateTime?           @map("expired_at") @db.Timestamptz(3)
  updatedAt              DateTime            @updatedAt @map("updated_at") @db.Timestamptz(3)
  client                 Client              @relation(fields: [clientId], references: [id], onDelete: Restrict)
  plan                   Plan                @relation(fields: [planId], references: [id], onDelete: Restrict)
  receiptImageAsset      ImageAsset?         @relation("PurchaseIntentReceipt", fields: [receiptImageAssetId], references: [id], onDelete: Restrict)
  createdByAccount       Account             @relation("PurchaseIntentCreatedBy", fields: [createdByAccountId], references: [id], onDelete: Restrict)
  payment                Payment?
  creditReservation      CreditReservation?

  @@unique([id, clientId])
  @@unique([id, clientId, planId])
  @@index([state, expiresAt, id])
  @@index([planId])
  @@index([createdByAccountId])
  @@map("purchase_intents")
  @@schema("booking")
}

model Payment {
  id                     String             @id @default(uuid()) @db.Uuid
  clientId               String             @map("client_id") @db.Uuid
  planId                 String             @map("plan_id") @db.Uuid
  purchaseIntentId       String?            @unique @map("purchase_intent_id") @db.Uuid
  planNameSnapshot       String             @map("plan_name_snapshot")
  durationMonthsSnapshot Int                @map("duration_months_snapshot") @db.SmallInt
  classAllowanceSnapshot Int                @map("class_allowance_snapshot")
  planPriceCentavos      Int                @map("plan_price_centavos")
  creditAppliedCentavos  Int                @map("credit_applied_centavos")
  amountDueCentavos      Int                @map("amount_due_centavos")
  method                 PaymentMethod
  state                  PaymentState
  collectedAtBranchId    String?            @map("collected_at_branch_id") @db.Uuid
  submittedByAccountId   String             @map("submitted_by_account_id") @db.Uuid
  submittedAt            DateTime           @map("submitted_at") @db.Timestamptz(3)
  decidedByAccountId     String?            @map("decided_by_account_id") @db.Uuid
  decidedAt              DateTime?          @map("decided_at") @db.Timestamptz(3)
  rejectionReason        String?            @map("rejection_reason")
  createdAt              DateTime           @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt              DateTime           @updatedAt @map("updated_at") @db.Timestamptz(3)
  client                 Client             @relation(fields: [clientId], references: [id], onDelete: Restrict)
  plan                   Plan               @relation(fields: [planId], references: [id], onDelete: Restrict)
  purchaseIntent         PurchaseIntent?    @relation(fields: [purchaseIntentId], references: [id], onDelete: Restrict)
  collectedAtBranch      Branch?            @relation(fields: [collectedAtBranchId], references: [id], onDelete: Restrict)
  submittedByAccount     Account            @relation("PaymentSubmittedBy", fields: [submittedByAccountId], references: [id], onDelete: Restrict)
  decidedByAccount       Account?           @relation("PaymentDecidedBy", fields: [decidedByAccountId], references: [id], onDelete: Restrict)
  subscription           Subscription?
  creditReservation      CreditReservation?
  qualifiedReferral      Referral?

  @@unique([id, clientId])
  @@unique([id, clientId, planId])
  @@index([clientId, state, submittedAt, id])
  @@index([state, submittedAt, id])
  @@index([method, decidedAt, id])
  @@index([planId])
  @@index([collectedAtBranchId, decidedAt])
  @@index([decidedByAccountId, decidedAt])
  @@map("payments")
  @@schema("booking")
}

model CreditReservation {
  id               String                 @id @default(uuid()) @db.Uuid
  clientId         String                 @map("client_id") @db.Uuid
  amountCentavos   Int                    @map("amount_centavos")
  purchaseIntentId String?                @unique @map("purchase_intent_id") @db.Uuid
  paymentId        String?                @unique @map("payment_id") @db.Uuid
  state            CreditReservationState @default(RESERVED)
  reservedAt       DateTime               @map("reserved_at") @db.Timestamptz(3)
  settledAt        DateTime?              @map("settled_at") @db.Timestamptz(3)
  createdAt        DateTime               @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt        DateTime               @updatedAt @map("updated_at") @db.Timestamptz(3)
  client           Client                 @relation(fields: [clientId], references: [id], onDelete: Restrict)
  purchaseIntent   PurchaseIntent?        @relation(fields: [purchaseIntentId], references: [id], onDelete: Restrict)
  payment          Payment?               @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  ledgerEntries    CreditLedgerEntry[]

  @@unique([id, clientId])
  @@index([clientId, state])
  @@index([state, reservedAt, id])
  @@map("credit_reservations")
  @@schema("booking")
}

model CreditLedgerEntry {
  id             String                @id @default(uuid()) @db.Uuid
  clientId       String                @map("client_id") @db.Uuid
  kind           CreditLedgerEntryKind
  amountCentavos Int                   @map("amount_centavos")
  occurredAt     DateTime              @default(now()) @map("occurred_at") @db.Timestamptz(3)
  reservationId  String?               @map("reservation_id") @db.Uuid
  referralId     String?               @map("referral_id") @db.Uuid
  actorKind      CreditLedgerActorKind @map("actor_kind")
  actorAccountId String?               @map("actor_account_id") @db.Uuid
  correlationId  String                @map("correlation_id") @db.Uuid
  client         Client                @relation(fields: [clientId], references: [id], onDelete: Restrict)
  reservation    CreditReservation?    @relation(fields: [reservationId], references: [id], onDelete: Restrict)
  referral       Referral?             @relation(fields: [referralId], references: [id], onDelete: Restrict)
  actorAccount   Account?              @relation("CreditLedgerActor", fields: [actorAccountId], references: [id], onDelete: Restrict)

  @@index([clientId, occurredAt, id])
  @@index([reservationId])
  @@index([referralId])
  @@index([actorAccountId])
  @@map("credit_ledger_entries")
  @@schema("booking")
}

model Referral {
  id                 String              @id @default(uuid()) @db.Uuid
  referrerClientId   String              @map("referrer_client_id") @db.Uuid
  referredClientId   String              @unique @map("referred_client_id") @db.Uuid
  state              ReferralState       @default(PENDING)
  qualifiedPaymentId String?             @unique @map("qualified_payment_id") @db.Uuid
  qualifiedAt        DateTime?           @map("qualified_at") @db.Timestamptz(3)
  awardCentavos      Int?                @map("award_centavos")
  awardedAt          DateTime?           @map("awarded_at") @db.Timestamptz(3)
  createdAt          DateTime            @default(now()) @map("created_at") @db.Timestamptz(3)
  referrer           Client              @relation("ReferralReferrer", fields: [referrerClientId], references: [id], onDelete: Restrict)
  referred           Client              @relation("ReferralReferred", fields: [referredClientId], references: [id], onDelete: Restrict)
  qualifiedPayment   Payment?            @relation(fields: [qualifiedPaymentId], references: [id], onDelete: Restrict)
  awardEntries       CreditLedgerEntry[]

  @@unique([id, referrerClientId])
  @@index([referrerClientId, createdAt, id])
  @@map("referrals")
  @@schema("booking")
}
```

`Subscription` amendment (decision (a) recommended form — nullable column):

```prisma
model Subscription {
  // ...existing fields unchanged...
  paymentId               String?           @unique @map("payment_id") @db.Uuid
  payment                 Payment?          @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  // ...existing relations unchanged...
}
```

If the user chooses the "required" alternative in decision (a), the two lines
become `paymentId String @unique ...` and `payment Payment @relation(...)`, and
the migration gains the backfill described there.

Reverse fields to add to existing models:

| Existing model | Fields to add                                                                                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Client`       | `purchaseIntents PurchaseIntent[]`, `payments Payment[]`, `creditReservations CreditReservation[]`, `creditLedgerEntries CreditLedgerEntry[]`, `referralsMade Referral[] @relation("ReferralReferrer")`, `referralReceived Referral? @relation("ReferralReferred")` |
| `Plan`         | `purchaseIntents PurchaseIntent[]`, `payments Payment[]`                                                                                                                                                                                       |
| `Branch`       | `cashPayments Payment[]`                                                                                                                                                                                                                       |
| `Account`      | `createdPurchaseIntents PurchaseIntent[] @relation("PurchaseIntentCreatedBy")`, `submittedPayments Payment[] @relation("PaymentSubmittedBy")`, `decidedPayments Payment[] @relation("PaymentDecidedBy")`, `creditLedgerEntries CreditLedgerEntry[] @relation("CreditLedgerActor")` |
| `ImageAsset`   | `receiptPurchaseIntent PurchaseIntent? @relation("PurchaseIntentReceipt")`                                                                                                                                                                     |

Prisma expresses the ordinary relations only. The composite ownership foreign
keys, partial unique indexes, checks, and triggers below are database-only
protections, following the pattern of `20260909000000_booking_workflow`.

## Migration SQL — proposed `20260922000000_payments`

```sql
-- CreateEnum
CREATE TYPE "booking"."PurchaseIntentState" AS ENUM ('open', 'submitted', 'expired');
CREATE TYPE "booking"."PaymentMethod" AS ENUM ('transfer', 'cash', 'credit_only');
CREATE TYPE "booking"."PaymentState" AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE "booking"."CreditLedgerEntryKind" AS ENUM ('referral_award', 'payment_reservation', 'payment_spend', 'payment_release');
CREATE TYPE "booking"."CreditLedgerActorKind" AS ENUM ('account', 'worker');
CREATE TYPE "booking"."CreditReservationState" AS ENUM ('reserved', 'spent', 'released');
CREATE TYPE "booking"."ReferralState" AS ENUM ('pending', 'awarded');

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

-- AlterTable (decision (a): nullable column; see alternative below)
ALTER TABLE "booking"."subscriptions" ADD COLUMN "payment_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intents_receipt_image_asset_id_key" ON "booking"."purchase_intents"("receipt_image_asset_id");
CREATE UNIQUE INDEX "purchase_intents_id_client_id_key" ON "booking"."purchase_intents"("id", "client_id");
CREATE UNIQUE INDEX "purchase_intents_id_client_id_plan_id_key" ON "booking"."purchase_intents"("id", "client_id", "plan_id");
CREATE INDEX "purchase_intents_state_expires_at_id_idx" ON "booking"."purchase_intents"("state", "expires_at", "id");
CREATE INDEX "purchase_intents_plan_id_idx" ON "booking"."purchase_intents"("plan_id");
CREATE INDEX "purchase_intents_created_by_account_id_idx" ON "booking"."purchase_intents"("created_by_account_id");

CREATE UNIQUE INDEX "payments_purchase_intent_id_key" ON "booking"."payments"("purchase_intent_id");
CREATE UNIQUE INDEX "payments_id_client_id_key" ON "booking"."payments"("id", "client_id");
CREATE UNIQUE INDEX "payments_id_client_id_plan_id_key" ON "booking"."payments"("id", "client_id", "plan_id");
CREATE INDEX "payments_client_id_state_submitted_at_id_idx" ON "booking"."payments"("client_id", "state", "submitted_at", "id");
CREATE INDEX "payments_state_submitted_at_id_idx" ON "booking"."payments"("state", "submitted_at", "id");
CREATE INDEX "payments_method_decided_at_id_idx" ON "booking"."payments"("method", "decided_at", "id");
CREATE INDEX "payments_plan_id_idx" ON "booking"."payments"("plan_id");
CREATE INDEX "payments_collected_at_branch_id_decided_at_idx" ON "booking"."payments"("collected_at_branch_id", "decided_at");
CREATE INDEX "payments_decided_by_account_id_decided_at_idx" ON "booking"."payments"("decided_by_account_id", "decided_at");

CREATE UNIQUE INDEX "credit_reservations_purchase_intent_id_key" ON "booking"."credit_reservations"("purchase_intent_id");
CREATE UNIQUE INDEX "credit_reservations_payment_id_key" ON "booking"."credit_reservations"("payment_id");
CREATE UNIQUE INDEX "credit_reservations_id_client_id_key" ON "booking"."credit_reservations"("id", "client_id");
CREATE INDEX "credit_reservations_client_id_state_idx" ON "booking"."credit_reservations"("client_id", "state");
CREATE INDEX "credit_reservations_state_reserved_at_id_idx" ON "booking"."credit_reservations"("state", "reserved_at", "id");

CREATE INDEX "credit_ledger_entries_client_id_occurred_at_id_idx" ON "booking"."credit_ledger_entries"("client_id", "occurred_at", "id");
CREATE INDEX "credit_ledger_entries_reservation_id_idx" ON "booking"."credit_ledger_entries"("reservation_id");
CREATE INDEX "credit_ledger_entries_referral_id_idx" ON "booking"."credit_ledger_entries"("referral_id");
CREATE INDEX "credit_ledger_entries_actor_account_id_idx" ON "booking"."credit_ledger_entries"("actor_account_id");

CREATE UNIQUE INDEX "referrals_referred_client_id_key" ON "booking"."referrals"("referred_client_id");
CREATE UNIQUE INDEX "referrals_qualified_payment_id_key" ON "booking"."referrals"("qualified_payment_id");
CREATE UNIQUE INDEX "referrals_id_referrer_client_id_key" ON "booking"."referrals"("id", "referrer_client_id");
CREATE INDEX "referrals_referrer_client_id_created_at_id_idx" ON "booking"."referrals"("referrer_client_id", "created_at", "id");

CREATE UNIQUE INDEX "subscriptions_payment_id_key" ON "booking"."subscriptions"("payment_id");

-- AddForeignKey
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "booking"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_receipt_image_asset_id_fkey" FOREIGN KEY ("receipt_image_asset_id") REFERENCES "system"."image_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."purchase_intents" ADD CONSTRAINT "purchase_intents_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "booking"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_purchase_intent_id_fkey" FOREIGN KEY ("purchase_intent_id") REFERENCES "booking"."purchase_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_collected_at_branch_id_fkey" FOREIGN KEY ("collected_at_branch_id") REFERENCES "booking"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_submitted_by_account_id_fkey" FOREIGN KEY ("submitted_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."payments" ADD CONSTRAINT "payments_decided_by_account_id_fkey" FOREIGN KEY ("decided_by_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."credit_reservations" ADD CONSTRAINT "credit_reservations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."credit_reservations" ADD CONSTRAINT "credit_reservations_purchase_intent_id_fkey" FOREIGN KEY ("purchase_intent_id") REFERENCES "booking"."purchase_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."credit_reservations" ADD CONSTRAINT "credit_reservations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "booking"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "booking"."credit_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "booking"."referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."referrals" ADD CONSTRAINT "referrals_referrer_client_id_fkey" FOREIGN KEY ("referrer_client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."referrals" ADD CONSTRAINT "referrals_referred_client_id_fkey" FOREIGN KEY ("referred_client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking"."referrals" ADD CONSTRAINT "referrals_qualified_payment_id_fkey" FOREIGN KEY ("qualified_payment_id") REFERENCES "booking"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."subscriptions" ADD CONSTRAINT "subscriptions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "booking"."payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
    payment_id UUID;
    payment_state "booking"."PaymentState";
    subscription_count INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'payments' THEN
        payment_id := NEW."id";
    ELSE
        payment_id := NEW."payment_id";
        IF payment_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state" INTO payment_state FROM "booking"."payments" WHERE "id" = payment_id;
    SELECT count(*) INTO subscription_count FROM "booking"."subscriptions" WHERE "payment_id" = payment_id;

    IF payment_state = 'confirmed' AND subscription_count <> 1 THEN
        RAISE EXCEPTION 'confirmed payment % must have exactly one subscription', payment_id USING ERRCODE = '23514';
    END IF;
    IF payment_state <> 'confirmed' AND subscription_count <> 0 THEN
        RAISE EXCEPTION 'payment % is not confirmed and cannot have a subscription', payment_id USING ERRCODE = '23514';
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
    reservation_id UUID;
    reservation RECORD;
    reservation_entries INTEGER;
    spend_entries INTEGER;
    release_entries INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'credit_reservations' THEN
        reservation_id := NEW."id";
    ELSE
        reservation_id := NEW."reservation_id";
        IF reservation_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state", "amount_centavos", "client_id" INTO reservation
      FROM "booking"."credit_reservations" WHERE "id" = reservation_id;

    SELECT count(*) INTO reservation_entries FROM "booking"."credit_ledger_entries"
      WHERE "reservation_id" = reservation_id AND "kind" = 'payment_reservation'
        AND "amount_centavos" = reservation."amount_centavos" AND "client_id" = reservation."client_id";
    SELECT count(*) INTO spend_entries FROM "booking"."credit_ledger_entries"
      WHERE "reservation_id" = reservation_id AND "kind" = 'payment_spend'
        AND "amount_centavos" = reservation."amount_centavos" AND "client_id" = reservation."client_id";
    SELECT count(*) INTO release_entries FROM "booking"."credit_ledger_entries"
      WHERE "reservation_id" = reservation_id AND "kind" = 'payment_release'
        AND "amount_centavos" = reservation."amount_centavos" AND "client_id" = reservation."client_id";

    IF reservation_entries <> 1 THEN
        RAISE EXCEPTION 'credit reservation % must have exactly one matching reservation entry', reservation_id USING ERRCODE = '23514';
    END IF;
    IF reservation."state" = 'reserved' AND (spend_entries + release_entries) <> 0 THEN
        RAISE EXCEPTION 'reserved credit reservation % cannot have a settlement entry', reservation_id USING ERRCODE = '23514';
    END IF;
    IF reservation."state" = 'spent' AND NOT (spend_entries = 1 AND release_entries = 0) THEN
        RAISE EXCEPTION 'spent credit reservation % must have exactly one matching spend entry', reservation_id USING ERRCODE = '23514';
    END IF;
    IF reservation."state" = 'released' AND NOT (release_entries = 1 AND spend_entries = 0) THEN
        RAISE EXCEPTION 'released credit reservation % must have exactly one matching release entry', reservation_id USING ERRCODE = '23514';
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
    referral_id UUID;
    referral RECORD;
    payment RECORD;
    award_entries INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'referrals' THEN
        referral_id := NEW."id";
    ELSE
        referral_id := NEW."referral_id";
        IF referral_id IS NULL THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT "state", "referrer_client_id", "referred_client_id", "qualified_payment_id", "award_centavos"
      INTO referral FROM "booking"."referrals" WHERE "id" = referral_id;

    SELECT count(*) INTO award_entries FROM "booking"."credit_ledger_entries"
      WHERE "referral_id" = referral_id AND "kind" = 'referral_award'
        AND "client_id" = referral."referrer_client_id"
        AND "amount_centavos" = referral."award_centavos";

    IF referral."state" = 'pending' THEN
        IF award_entries <> 0 THEN
            RAISE EXCEPTION 'pending referral % cannot have an award entry', referral_id USING ERRCODE = '23514';
        END IF;
        RETURN NULL;
    END IF;

    SELECT "state", "client_id" INTO payment FROM "booking"."payments" WHERE "id" = referral."qualified_payment_id";
    IF payment."state" IS DISTINCT FROM 'confirmed' OR payment."client_id" <> referral."referred_client_id" THEN
        RAISE EXCEPTION 'awarded referral % requires a confirmed payment of the referred client', referral_id USING ERRCODE = '23514';
    END IF;
    IF award_entries <> 1 THEN
        RAISE EXCEPTION 'awarded referral % must have exactly one matching award entry', referral_id USING ERRCODE = '23514';
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

CREATE CONSTRAINT TRIGGER "payments_referral_consistency"
    AFTER UPDATE OF "state" ON "booking"."payments"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION "booking"."assert_payment_referral_consistency"();
```

The last trigger needs a small companion function so that a Payment that stops
being confirmed can never leave an awarded Referral behind (defensive; the
Payment immutability trigger already forbids that transition):

```sql
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
```

In the committed migration this function is declared before the trigger that
uses it; it is shown separately here only to explain its purpose.

### Alternative for decision (a): required `payment_id`

If the user prefers the proposal's literal "required" column, the `AlterTable`
and its checks become:

```sql
ALTER TABLE "booking"."subscriptions" ADD COLUMN "payment_id" UUID;

-- Backfill: one confirmed cash Payment per existing Subscription, collected at
-- the first Branch, submitted and decided by the Subscription owner's Account
-- at activation time. Snapshots copy the Subscription's own snapshot fields;
-- credit_applied is 0 and amount_due equals the Plan price at that time.
INSERT INTO "booking"."payments" (...)
SELECT ... FROM "booking"."subscriptions" s JOIN "booking"."plans" p ON p."id" = s."plan_id" ...;
UPDATE "booking"."subscriptions" s SET "payment_id" = p."id" FROM "booking"."payments" p WHERE ...;

ALTER TABLE "booking"."subscriptions" ALTER COLUMN "payment_id" SET NOT NULL;
```

This synthesizes financial history that never happened, which is why the
nullable form is recommended; the exact backfill SQL is written only if this
alternative is chosen.

## Database-only protections summary

- one open Purchase Intent and one pending Payment per Client;
- amounts are non-negative, Credit never exceeds the Plan price, and
  `amount_due = price − credit` on both Intent and Payment;
- method/state field completeness and mutual exclusion, cash/credit-only
  created confirmed by their submitter, transfer bound to a submitted Intent;
- rejection reason trimmed, 1–300 characters, present only when rejected;
- Reservation has exactly one source and one conditional transition;
- ledger entries are positive, parented by kind, actor-consistent, and
  append-only; at most one reservation and one settlement entry per Reservation
  and one award per Referral;
- Referral is never self-referential, one referrer per referred Client, and
  awards carry complete evidence;
- ownership composite keys keep Intent/Payment/Subscription/Reservation/ledger/
  Referral rows on the same Client (or referrer) and Plan;
- commercial snapshots, attribution, and settled decisions are immutable, and
  financial rows cannot be deleted; and
- deferred commit-time triggers enforce Payment↔Subscription,
  Intent↔Payment, Reservation↔ledger, and Referral↔Payment/ledger
  cardinalities.

Eligibility, effective-Subscription evaluation, Credit availability, snapshot
equality between Intent and Payment, receipt purpose/owner/state checks,
authorization, idempotency, Bolivia date arithmetic, notifications, and audit
remain use-case transaction rules per PAY-001.

## Decisions required before approval

| # | Decision | Options | Recommended |
| --- | --- | --- | --- |
| (a) | `subscriptions.payment_id` for rows that exist before the migration (development fixtures, integration-test rows, any seeded data) | **Nullable column**: `payment_id` may be null only for pre-existing rows; every PAY-002 command sets it, and the deferred trigger enforces that any set value points at a confirmed Payment. **Required column**: synthesize one confirmed cash Payment per existing Subscription in the migration (alternative above) so `NOT NULL` holds. | Nullable. It keeps the migration free of invented financial history; the application invariant "new Subscriptions always come from a confirmed Payment" is enforced by the commands and tests, and the Payment→Subscription cardinality trigger still holds for every real Payment. |
| (b) | Receipt image variants: PAY-001 requires `ImageVariant` thumbnail + readable variants, but ADR-0073 output sizes/quality are still unspecified by any approved screen | Wait for variant specs before receipts; or attach the READY original asset now and add variants when specified. | Attach the READY original now. Attachment, ownership, purpose, and state checks are unchanged; only Administrator receipt viewing later switches from the original to the readable variant. |
| (c) | Stable error-code spelling: PAY-001 lists kebab-case (`subscription-not-expired`) while every existing endpoint uses snake_case (`booking_access_denied`) | kebab-case as written; or snake_case (`subscription_not_expired`, `purchase_intent_open_exists`, `payment_pending_exists`, `credit_insufficient`, `plan_not_purchasable`, `referral_code_invalid`, `payment_confirmation_conflict`, …). | snake_case, matching the existing contract. |
| (d) | Referral attribution at signup: Client registration (IDN-003) accepts no referral code today | Add an optional `referralCode` to `POST /client-registrations`, resolved and validated (`referral_code_invalid`, `referral_self_reference`) in the registration transaction; or postpone Referrals. | Add the optional field in PAY-002; the Referral table is otherwise unreachable. |
| (e) | Transfer-instructions and reward configuration | Environment variables `TRANSFER_BENEFICIARY_NAME`, `TRANSFER_BANK_NAME`, `TRANSFER_ACCOUNT_NUMBER`, `TRANSFER_QR_IMAGE_PATH` (a backend-served image file, no bucket URL) and `REFERRAL_REWARD_CENTAVOS=6000` (startup rejects any other value), all required outside `NODE_ENV=production` defaults for local development. | Adopt these names; local defaults point at a placeholder QR under `.data/`. |

Approval of the migration is understood as approval of the recommended option
for each row unless the user says otherwise.

## How it will be verified

Before any commit of the migration:

1. `pnpm --filter @pilates/backend prisma:validate` passes with the merged
   models, and `prisma migrate diff` from the merged schema matches the
   generated portion of the SQL above.
2. `prisma migrate deploy` runs only against a disposable `pilates_test_*`
   database (never `emma_pilates`, shared development, or production).
3. A constraint fixture `test/database/fixtures/payments-constraints.sql`, in the
   style of `booking-workflow-constraints.sql`, exercises every check, partial
   unique index, immutability trigger, append-only trigger, and deferred
   consistency trigger with valid rows and rejected mutations inside a rolled-back
   transaction, and a `payments-schema.integration-spec.ts` runs it.
4. Real PostgreSQL integration tests cover the PAY-001 validation list:
   concurrent Purchase Intent creation, expiry racing attachment/submission,
   cash racing an open Intent, two Administrators deciding one Payment,
   activation racing stale expiration, exactly-once spend/release, ownership
   violations, and Referral award racing duplicate delivery.
5. The full backend unit suite, e2e contract tests, `pnpm check:api`, lint, and
   typecheck pass, and the backlog row for PAY-002 records the migration commit.
