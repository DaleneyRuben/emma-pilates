import type { Prisma } from '../../generated/prisma/client';
import { PaymentMethod, PaymentState } from '../../generated/prisma/client';

type Transaction = Prisma.TransactionClient;

// The first real Payment of the Client's life, excluding the one being
// confirmed. A retry finds it already confirmed and applies nothing.
export const hasEarlierRealPayment = async (
  transaction: Transaction,
  input: { clientId: string; paymentId?: string },
): Promise<boolean> => {
  const earlier = await transaction.payment.findFirst({
    where: {
      clientId: input.clientId,
      ...(input.paymentId === undefined
        ? {}
        : { id: { not: input.paymentId } }),
      state: PaymentState.CONFIRMED,
      method: { not: PaymentMethod.COURTESY },
      planPriceCentavos: { gt: 0 },
    },
    select: { id: true },
  });
  return earlier !== null;
};
