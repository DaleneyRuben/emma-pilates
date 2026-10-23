import type { PrismaClient } from '../generated/prisma/client';

export const recomputeStudioFacts = (
  prisma: PrismaClient,
  input: { month: Date; now: () => Date },
): Promise<void> => {
  void prisma;
  void input;
  return Promise.resolve();
};
