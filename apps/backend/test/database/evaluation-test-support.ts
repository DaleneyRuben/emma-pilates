import { randomUUID } from 'node:crypto';
import { EvaluationRuleError } from '../../src/booking/evaluations/evaluation-errors';
import { BookingAccessDeniedError } from '../../src/booking/commands/create-booking';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import { PrismaClient } from '../../src/generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// Monday 2026-09-21, 11:00 in Bolivia.
export const fixtureToday = new Date('2026-09-21T00:00:00.000Z');
export const fixtureNow = new Date('2026-09-21T15:00:00.000Z');

export const branchIdOf = (key: 'centro' | 'equipetrol' | 'urubo') =>
  deterministicId(`branch:${key}`);

export const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof EvaluationRuleError) return error.code;
    if (error instanceof BookingAccessDeniedError)
      return 'booking_access_denied';
    return String(error);
  }
};

export type EvaluationTestWorld = {
  context: DatabaseTestContext;
  prisma: PrismaClient;
  principalOf(email: string): Promise<AuthenticatedPrincipal>;
  stop(): Promise<void>;
};

// The development fixtures plus two Nutritionists who start without blocks
// (Carla at Centro and Equipetrol, Noa at Centro) and Ana and Bea, Clients
// whose active Subscriptions cover September through November.
export const startEvaluationTestWorld =
  async (): Promise<EvaluationTestWorld> => {
    const context = await startDatabaseTestContext();
    const prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    const fixtures = buildDevelopmentFixtures({ today: fixtureToday });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
      // The slot horizon follows this clock, so it must agree with fixtureNow.
      now: () => fixtureNow,
    });

    for (const [key, name, branches] of [
      ['carla', 'Carla Rivas', ['centro', 'equipetrol']],
      ['noa', 'Noa Salinas', ['centro']],
    ] as const) {
      await prisma.staffMember.create({
        data: {
          id: deterministicId(`test-nutritionist:${key}`),
          name,
          role: 'NUTRITIONIST',
          branchAssignments: {
            create: branches.map((branch) => ({
              branchId: branchIdOf(branch),
            })),
          },
          account: {
            create: {
              email: `${key}@example.com`,
              activatedAt: fixtureNow,
              emailVerifiedAt: fixtureNow,
            },
          },
        },
      });
    }

    const plan = fixtures.plans[0];
    for (const [key, name] of [
      ['ana', 'Ana Justiniano'],
      ['bea', 'Bea Montaño'],
    ] as const) {
      await prisma.client.create({
        data: {
          id: deterministicId(`test-client:${key}`),
          name,
          referralCode: `REF-${key.toUpperCase()}-TEST`,
          account: {
            create: {
              email: `${key}@example.com`,
              activatedAt: fixtureNow,
              emailVerifiedAt: fixtureNow,
            },
          },
          subscriptions: {
            create: {
              planId: plan.id,
              planNameSnapshot: plan.name,
              durationDaysSnapshot: plan.durationDays,
              originalClassAllowance: plan.classAllowance,
              remainingClassAllowance: plan.classAllowance,
              startsOn: new Date('2026-09-01T00:00:00.000Z'),
              endsOn: new Date('2026-11-30T00:00:00.000Z'),
              activatedAt: new Date('2026-09-01T12:00:00.000Z'),
            },
          },
        },
      });
    }

    const principalOf = async (
      email: string,
    ): Promise<AuthenticatedPrincipal> => {
      const account = await prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
        select: {
          id: true,
          clientId: true,
          staffMember: {
            select: {
              id: true,
              role: true,
              branchAssignments: { select: { branchId: true } },
            },
          },
        },
      });

      return {
        accountId: account.id,
        authenticationSessionId: randomUUID(),
        identity:
          account.staffMember === null
            ? { kind: 'client', clientId: account.clientId! }
            : {
                kind: 'staff',
                staffMemberId: account.staffMember.id,
                role: account.staffMember.role.toLowerCase() as Lowercase<
                  typeof account.staffMember.role
                >,
                branchIds: account.staffMember.branchAssignments.map(
                  ({ branchId }) => branchId,
                ),
              },
      };
    };

    return {
      context,
      prisma,
      principalOf,
      stop: async () => {
        await prisma.$disconnect();
        await context.stop();
      },
    };
  };
