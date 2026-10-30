import type { Prisma } from '../../generated/prisma/client';
import { PaymentMethod, PaymentState } from '../../generated/prisma/client';

type Transaction = Prisma.TransactionClient;

// A single class is not a Plan, so it leaves the first real Plan eligible.
// The Gift Class keeps its own history: a single class still counts there.
export const hasEarlierPlanPayment = async (
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
      classAllowanceSnapshot: { gt: 1 },
    },
    select: { id: true },
  });
  return earlier !== null;
};
