import type { Prisma } from '../../generated/prisma/client';
import {
  CreditLedgerActorKind,
  PurchaseIntentState,
  SubscriptionState,
} from '../../generated/prisma/client';
import {
  scheduleReceiptDeletion,
  settleReservation,
} from '../payments/purchase-intent-settlement';
import type { ClosureTransaction } from './close-client-account';
import { closureScope } from './closure-scope';

type Steps = Pick<
  ClosureTransaction,
  'hasPendingTransferPayment' | 'releaseOpenPurchaseIntent' | 'endSubscription'
>;

// The Payment and Subscription steps of Account closure (G3, G5). Credit is
// retired (booking ADR-0009), so closure forfeits none.
export const createMembershipSteps = (
  transaction: Prisma.TransactionClient,
): Steps => ({
  hasPendingTransferPayment: async (clientId) =>
    (await transaction.payment.count({
      where: closureScope.pendingPayments(clientId),
    })) > 0,

  // An open Intent may hold an uploaded receipt (and, from before PAY-005,
  // Credit); both go back the way the expiry job returns them.
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
});
