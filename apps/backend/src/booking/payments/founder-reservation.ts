import type { Prisma } from '../../generated/prisma/client';
import { FounderMembershipStatus } from '../../generated/prisma/client';

type Transaction = Prisma.TransactionClient;

// A reservation belongs to the sale that priced it. Releasing by client
// frees a place a later sale already took over.
export const repointFounderReservation = (
  transaction: Transaction,
  input: {
    clientId: string;
    purchaseIntentId?: string | null;
    paymentId?: string | null;
  },
): Promise<unknown> =>
  transaction.founderMembership.updateMany({
    where: {
      clientId: input.clientId,
      status: FounderMembershipStatus.RESERVED,
      deletedAt: null,
    },
    data: {
      purchaseIntentId: input.purchaseIntentId ?? null,
      paymentId: input.paymentId ?? null,
    },
  });

const reservationSale = (input: {
  purchaseIntentId?: string;
  paymentId?: string;
}): { purchaseIntentId: string } | { paymentId: string } => {
  if (input.purchaseIntentId !== undefined) {
    return { purchaseIntentId: input.purchaseIntentId };
  }
  if (input.paymentId !== undefined) return { paymentId: input.paymentId };
  throw new Error('A founder reservation release names the sale');
};

export const releaseFounderReservationOf = (
  transaction: Transaction,
  input: {
    purchaseIntentId?: string;
    paymentId?: string;
    now: Date;
  },
): Promise<unknown> =>
  transaction.founderMembership.updateMany({
    where: {
      status: FounderMembershipStatus.RESERVED,
      deletedAt: null,
      ...reservationSale(input),
    },
    data: { deletedAt: input.now },
  });
