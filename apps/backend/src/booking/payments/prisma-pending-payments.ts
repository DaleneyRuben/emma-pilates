import type { PrismaClient } from '../../generated/prisma/client';
import {
  PaymentKind,
  PaymentMethod,
  PaymentState,
} from '../../generated/prisma/client';
import {
  clientNameAndPhoto,
  clientNameSelect,
} from '../client/client-photo-of';
import {
  evaluationReceiptOf,
  evaluationReceiptSelect,
} from '../evaluations/evaluation-payment-receipt';
import { evaluationSaleSelect, evaluationStartsAtOf } from './evaluation-sale';
import { saleLabel } from './payment-label';
import type { PendingPaymentSummary } from './payment-views';

// S11's queue: every transfer waiting for review, oldest first.
export const listPendingTransfers = async (
  prisma: PrismaClient,
): Promise<PendingPaymentSummary[]> => {
  const rows = await prisma.payment.findMany({
    where: { state: PaymentState.PENDING, method: PaymentMethod.TRANSFER },
    orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      kind: true,
      planNameSnapshot: true,
      amountDueCentavos: true,
      submittedAt: true,
      client: clientNameSelect,
      purchaseIntent: {
        select: { receiptImageAsset: { select: evaluationReceiptSelect } },
      },
      ...evaluationSaleSelect,
    },
  });
  return rows.map((row) => {
    const kind = row.kind === PaymentKind.EVALUATION ? 'evaluation' : 'plan';
    return {
      id: row.id,
      ...clientNameAndPhoto(row.client),
      planName: saleLabel({ kind, planNameSnapshot: row.planNameSnapshot }),
      kind,
      ...evaluationStartsAtOf(row),
      amountDueCentavos: row.amountDueCentavos,
      submittedAt: row.submittedAt,
      receiptAvailable:
        evaluationReceiptOf(row.purchaseIntent?.receiptImageAsset) !== null,
    };
  });
};
