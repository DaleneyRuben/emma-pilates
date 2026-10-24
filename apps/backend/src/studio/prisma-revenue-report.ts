import type { PrismaClient } from '../generated/prisma/client';

export type RevenueMonth = {
  accruedCentavos: number;
  cashCentavos: number;
  deferredCentavos: number;
  classesStillOwed: number;
};

export const readRevenueMonth = (
  prisma: PrismaClient,
  input: { month: Date; today: Date },
): Promise<RevenueMonth> => {
  void prisma;
  void input;
  return Promise.resolve({
    accruedCentavos: 0,
    cashCentavos: 0,
    deferredCentavos: 0,
    classesStillOwed: 0,
  });
};
