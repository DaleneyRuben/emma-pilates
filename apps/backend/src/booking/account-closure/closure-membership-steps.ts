import type { Prisma } from '../../generated/prisma/client';
import {
  CreditLedgerActorKind,
  CreditLedgerEntryKind,
  PaymentState,
  PurchaseIntentState,
  SubscriptionState,
} from '../../generated/prisma/client';
import { summarizeCredit } from '../payments/credit-summary';
import {
  scheduleReceiptDeletion,
  settleReservation,
} from '../payments/purchase-intent-settlement';
import type { ClosureTransaction } from './close-client-account';

type Steps = Pick<
  ClosureTransaction,
  | 'hasPendingTransferPayment'
  | 'releaseOpenPurchaseIntent'
  | 'endSubscription'
  | 'forfeitCredit'
>;

// The Payment, Subscription, and Credit steps of Account closure (G3, G5).
export const createMembershipSteps = (
  transaction: Prisma.TransactionClient,
): Steps => ({
  hasPendingTransferPayment: async (clientId) =>
    (await transaction.payment.count({
      where: { clientId, state: PaymentState.PENDING },
    })) > 0,

  // An open Intent holds Credit and possibly an uploaded receipt; both go
  // back the way the expiry job returns them.
  releaseOpenPurchaseIntent: async ({ clientId, accountId, occurredAt }) => {
    const intent = await transaction.purchaseIntent.findFirst({
      where: { clientId, state: PurchaseIntentState.OPEN },
      select: { id: true, receiptImageAssetId: true },
    });
    if (intent === null) return false;
    await transaction.purchaseIntent.update({
      where: { id: intent.id },
      data: { state: PurchaseIntentState.EXPIRED, expiredAt: occurredAt },
    });
    await settleReservation(transaction, {
      purchaseIntentId: intent.id,
      outcome: 'released',
      now: occurredAt,
      actor: { kind: CreditLedgerActorKind.ACCOUNT, accountId },
      correlationId: intent.id,
    });
    await scheduleReceiptDeletion(
      transaction,
      intent.receiptImageAssetId,
      occurredAt,
      false,
    );
    return true;
  },

  // No refund and no class returned: the remaining allowance stays on the
  // row as history.
  endSubscription: async ({ clientId, occurredAt }) => {
    const active = await transaction.subscription.findFirst({
      where: { clientId, state: SubscriptionState.ACTIVE },
      select: { id: true, remainingClassAllowance: true },
    });
    if (active === null) return null;
    await transaction.subscription.update({
      where: { id: active.id },
      data: { state: SubscriptionState.EXPIRED, expiredAt: occurredAt },
    });
    return { forfeitedClasses: active.remainingClassAllowance };
  },

  forfeitCredit: async ({ clientId, accountId, occurredAt, correlationId }) => {
    const entries = await transaction.creditLedgerEntry.findMany({
      where: { clientId },
      select: { kind: true, amountCentavos: true },
    });
    const { availableCentavos } = summarizeCredit(
      entries.map((entry) => ({
        kind: entry.kind.toLowerCase() as Lowercase<CreditLedgerEntryKind>,
        amountCentavos: entry.amountCentavos,
      })),
    );
    if (availableCentavos <= 0) return 0;
    await transaction.creditLedgerEntry.create({
      data: {
        clientId,
        kind: CreditLedgerEntryKind.ACCOUNT_CLOSURE,
        amountCentavos: availableCentavos,
        occurredAt,
        actorKind: CreditLedgerActorKind.ACCOUNT,
        actorAccountId: accountId,
        correlationId,
      },
    });
    return availableCentavos;
  },
});
