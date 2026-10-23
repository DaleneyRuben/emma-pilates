import type { PrismaClient } from '../../generated/prisma/client';
import type { ClientAcquisitionStore } from './client-acquisition';
import type { TrainerReferralCodeStore } from './trainer-referral-code';

const pending = () => Promise.reject(new Error('pending'));

export const createPrismaClientAcquisitionStore = (
  prisma: PrismaClient,
): ClientAcquisitionStore => {
  void prisma;
  return { read: pending, correct: pending };
};

export const createPrismaTrainerReferralCodeStore = (
  prisma: PrismaClient,
): TrainerReferralCodeStore => {
  void prisma;
  return { find: pending, set: pending };
};
