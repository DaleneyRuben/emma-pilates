import type { Prisma } from '../../generated/prisma/client';
import {
  CreditLedgerActorKind,
  CreditLedgerEntryKind,
  CreditReservationState,
} from '../../generated/prisma/client';

type Transaction = Prisma.TransactionClient;

const dayMilliseconds = 24 * 60 * 60 * 1_000;
// Receipts are deleted at the later of 45 days after finalization or 7 days
// after the decision, keeping the metadata tombstone.
const receiptRetentionAfterFinalizationMilliseconds = 45 * dayMilliseconds;
const receiptRetentionAfterDecisionMilliseconds = 7 * dayMilliseconds;

// Settles the Credit a Purchase Intent reserved: spent when the purchase is
// decided, released when the Intent expires.
export const settleReservation = async (
  transaction: Transaction,
  input: {
    purchaseIntentId: string;
    outcome: 'spent' | 'released';
    now: Date;
    actor: { kind: CreditLedgerActorKind; accountId: string | null };
    correlationId: string;
  },
): Promise<void> => {
  const reservation = await transaction.creditReservation.findUnique({
    where: { purchaseIntentId: input.purchaseIntentId },
    select: { id: true, clientId: true, amountCentavos: true, state: true },
  });
  if (
    reservation === null ||
    reservation.state !== CreditReservationState.RESERVED
  ) {
    return;
  }
  await transaction.creditReservation.update({
    where: { id: reservation.id },
    data: {
      state:
        input.outcome === 'spent'
          ? CreditReservationState.SPENT
          : CreditReservationState.RELEASED,
      settledAt: input.now,
    },
  });
  await transaction.creditLedgerEntry.create({
    data: {
      clientId: reservation.clientId,
      kind:
        input.outcome === 'spent'
          ? CreditLedgerEntryKind.PAYMENT_SPEND
          : CreditLedgerEntryKind.PAYMENT_RELEASE,
      amountCentavos: reservation.amountCentavos,
      occurredAt: input.now,
      reservationId: reservation.id,
      actorKind: input.actor.kind,
      actorAccountId: input.actor.accountId,
      correlationId: input.correlationId,
    },
  });
};

export const scheduleReceiptDeletion = async (
  transaction: Transaction,
  receiptImageAssetId: string | null,
  now: Date,
  afterDecision: boolean,
): Promise<void> => {
  if (receiptImageAssetId === null) return;
  const asset = await transaction.imageAsset.findUnique({
    where: { id: receiptImageAssetId },
    select: { finalizedAt: true },
  });
  if (asset === null) return;
  const dueAt = afterDecision
    ? new Date(
        Math.max(
          (asset.finalizedAt ?? now).getTime() +
            receiptRetentionAfterFinalizationMilliseconds,
          now.getTime() + receiptRetentionAfterDecisionMilliseconds,
        ),
      )
    : now;
  await transaction.imageAsset.update({
    where: { id: receiptImageAssetId },
    data: { deletionDueAt: dueAt },
  });
};
