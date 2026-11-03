import type { Prisma } from '../../generated/prisma/client';

export const claimReadableReferralCode: (
  transaction: Prisma.TransactionClient,
  name: string,
) => Promise<string> = () => Promise.reject(new Error('not built'));
