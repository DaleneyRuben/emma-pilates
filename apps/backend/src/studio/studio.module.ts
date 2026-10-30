import { Module, NotFoundException } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import { studioKpiRole, requireStudioAdministrator } from './studio-errors';
import { recomputeStudioFacts } from './prisma-studio-facts';
import { studioMonthsToRecompute } from './recompute-months';
import { readMonthKpis } from './prisma-month-kpis';
import {
  dismissRecommendation,
  readRecommendations,
  recomputeRecommendations,
} from './prisma-recommendations';
import { readRevenueMonth } from './prisma-revenue-report';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { narrativeFromReads, questionFromCounts } from './narrate-month';
import { studioOperations, type StudioOperations } from './studio-operations';
import { studioControllers } from './studio.controller';

const monthDate = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
};

export const createStudioOperations = (deps: {
  readKpis: typeof readMonthKpis;
  readRevenue: typeof readRevenueMonth;
  readRecommendations: typeof readRecommendations;
  recomputeRecommendations: typeof recomputeRecommendations;
  dismissRecommendation: typeof dismissRecommendation;
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
  list: async (
    input: { month: string },
    principal: AuthenticatedPrincipal,
    prisma: PrismaClient,
  ) => {
    studioKpiRole(principal);
    const recommendations = await deps.readRecommendations(prisma, {
      month: monthDate(input.month),
    });
    return { month: input.month, recommendations };
  },
  recomputeRecommendations: async (
    input: { month: string },
    principal: AuthenticatedPrincipal,
    prisma: PrismaClient,
  ) => {
    requireStudioAdministrator(principal);
    const result = await deps.recomputeRecommendations(prisma, {
      month: monthDate(input.month),
      today: new Date(),
    });
    return { month: input.month, ...result };
  },
  dismiss: async (
    input: { id: string },
    principal: AuthenticatedPrincipal,
    prisma: PrismaClient,
  ) => {
    requireStudioAdministrator(principal);
    const dismissed = await deps.dismissRecommendation(prisma, input);
    if (dismissed === null) {
      throw new NotFoundException({
        code: 'resource_not_found',
        detail: 'Recommendation not found',
      });
    }
    return dismissed;
  },
  narrative: async (
    input: { month: string },
    principal: AuthenticatedPrincipal,
    prisma: PrismaClient,
  ) => {
    requireStudioAdministrator(principal);
    const counts = await deps.readKpis(prisma, {
      month: monthDate(input.month),
    });
    const listed = await deps.readRecommendations(prisma, {
      month: monthDate(input.month),
    });
    return narrativeFromReads({
      month: input.month,
      kpis: counts,
      recommendations: listed,
    });
  },
  question: async (
    input: { month: string; question: string },
    principal: AuthenticatedPrincipal,
    prisma: PrismaClient,
  ) => {
    requireStudioAdministrator(principal);
    const counts = await deps.readKpis(prisma, {
      month: monthDate(input.month),
    });
    return questionFromCounts(input.question, counts);
  },
});

@Module({
  imports: [SystemIdentityModule],
  controllers: studioControllers,
  providers: [
    {
      provide: studioOperations,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient): StudioOperations => {
        const operations = createStudioOperations({
          readKpis: readMonthKpis,
          readRevenue: readRevenueMonth,
          readRecommendations,
          recomputeRecommendations,
          dismissRecommendation,
        });
        return {
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
          kpis: (input, principal) => operations.kpis(input, principal, prisma),
          recommendations: (input, principal) =>
            operations.list(input, principal, prisma),
          recomputeRecommendations: (input, principal) =>
            operations.recomputeRecommendations(input, principal, prisma),
          dismissRecommendation: (input, principal) =>
            operations.dismiss(input, principal, prisma),
          narrative: (input, principal) =>
            operations.narrative(input, principal, prisma),
          question: (input, principal) =>
            operations.question(input, principal, prisma),
        };
      },
    },
  ],
})
export class StudioModule {}

// The worker's daily run: the current month, and the previous one until it
// is final (recompute-months.ts).
export const recomputeCurrentStudioMonth = async (
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<{ sessions: number; clientMonths: number }> => {
  const total = { sessions: 0, clientMonths: 0 };
  // One month failing leaves the other to run. The first failure is thrown
  // afterwards so the worker reports it, and the next day retries.
  let failure: Error | null = null;
  for (const month of studioMonthsToRecompute(now)) {
    try {
      const result = await recomputeStudioFacts(prisma, {
        month,
        now: () => now,
      });
      total.sessions += result.sessions;
      total.clientMonths += result.clientMonths;
    } catch (error) {
      failure ??= error instanceof Error ? error : new Error(String(error));
    }
  }
  if (failure !== null) throw failure;
  return total;
};
