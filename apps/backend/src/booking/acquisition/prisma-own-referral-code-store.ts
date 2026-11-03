import type { PrismaClient } from '../../generated/prisma/client';
import type { OwnReferralCodeStore } from './own-referral-code';

const notBuilt = () => Promise.reject(new Error('not built'));

export const createPrismaOwnReferralCodeStore = (
  prisma: PrismaClient,
): OwnReferralCodeStore => {
  void prisma;
  return { find: notBuilt, status: notBuilt, change: notBuilt };
};
