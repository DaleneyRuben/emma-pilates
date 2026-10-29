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
      ...(input.purchaseIntentId !== undefined
        ? { purchaseIntentId: input.purchaseIntentId }
        : { paymentId: input.paymentId }),
    },
    data: { deletedAt: input.now },
  });
