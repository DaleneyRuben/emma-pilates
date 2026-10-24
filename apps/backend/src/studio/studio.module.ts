import { Module } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import { studioKpiRole, requireStudioAdministrator } from './studio-errors';
import {
  recomputeStudioFacts,
  currentStudioMonth,
} from './prisma-studio-facts';
import { readMonthKpis } from './prisma-month-kpis';
import { readRevenueMonth } from './prisma-revenue-report';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import {
  studioControllers,
  studioOperations,
  type StudioOperations,
} from './studio.controller';

const monthDate = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
};

export const createStudioOperations = (deps: {
  readKpis: typeof readMonthKpis;
  readRevenue: typeof readRevenueMonth;
}) => ({
  kpis: async (
    input: { month: string },
    principal: AuthenticatedPrincipal,
    prisma: PrismaClient,
  ) => {
    const role = studioKpiRole(principal);
    const counts = await deps.readKpis(prisma, {
      month: monthDate(input.month),
    });
    if (role !== 'administrator') {
      return { month: input.month, ...counts };
    }
    const amounts = await deps.readRevenue(prisma, {
      month: monthDate(input.month),
      today: new Date(),
    });
    return { month: input.month, ...counts, ...amounts };
  },
});

@Module({
  imports: [SystemIdentityModule],
  controllers: studioControllers,
  providers: [
    {
      provide: studioOperations,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient): StudioOperations => ({
        recompute: async (input, principal) => {
          requireStudioAdministrator(principal);
          const result = await recomputeStudioFacts(prisma, {
            month: monthDate(input.month),
            now: () => new Date(),
          });
          return { month: input.month, ...result };
        },
        revenue: async (input, principal) => {
          requireStudioAdministrator(principal);
          const result = await readRevenueMonth(prisma, {
            month: monthDate(input.month),
            today: new Date(),
          });
          return { month: input.month, ...result };
        },
        kpis: (input, principal) =>
          createStudioOperations({
            readKpis: readMonthKpis,
            readRevenue: readRevenueMonth,
          }).kpis(input, principal, prisma),
      }),
    },
  ],
})
export class StudioModule {}

export const recomputeCurrentStudioMonth = (prisma: PrismaClient) =>
  recomputeStudioFacts(prisma, {
    month: currentStudioMonth(new Date()),
    now: () => new Date(),
  });
