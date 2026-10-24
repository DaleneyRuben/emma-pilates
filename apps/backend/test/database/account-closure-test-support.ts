import { randomUUID } from 'node:crypto';
import { hashPassword } from '../../src/system-identity/security/argon2-password-hasher';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

export const closurePassword = 'closure-test-password';
export const closureNow = fixtureNow;

export type ClosureClient = {
  clientId: string;
  accountId: string;
  email: string;
  subscriptionId: string;
  principal: AuthenticatedPrincipal;
};

export type ClosureWorld = EvaluationTestWorld & {
  administrator: AuthenticatedPrincipal;
  newClient: (
    name: string,
    options?: { subscription?: boolean },
  ) => Promise<ClosureClient>;
  // Rows the commands stamp with the real clock predate the fixed test clock.
  backdate: (clientId: string) => Promise<void>;
  newSession: (options: {
    capacity?: number;
    startsAt?: Date;
  }) => Promise<string>;
};

// The evaluation world (development fixtures, Nutritionists) plus builders
// for Clients with a real password hash, a September–November Subscription,
// and Sessions with their own Trainer.
export const startClosureWorld = async (): Promise<ClosureWorld> => {
  const world = await startEvaluationTestWorld();
  const { prisma } = world;
  const passwordHash = await hashPassword(closurePassword);
  const plan = await prisma.plan.findFirstOrThrow({
    orderBy: { displayOrder: 'asc' },
  });
  const classType = await prisma.classType.findFirstOrThrow();

  const newClient = async (
    name: string,
    { subscription = true } = {},
  ): Promise<ClosureClient> => {
    const email = `${randomUUID()}@example.com`;
    const created = await prisma.client.create({
      data: {
        name,
        phone: '+591 70000000',
        referralCode: randomUUID().slice(0, 8),
        account: {
          create: {
            email,
            passwordHash,
            activatedAt: closureNow,
            emailVerifiedAt: closureNow,
          },
        },
        subscriptions: {
          create: !subscription
            ? []
            : {
                planId: plan.id,
                planNameSnapshot: plan.name,
                durationDaysSnapshot: plan.durationDays,
                originalClassAllowance: 8,
                remainingClassAllowance: 8,
                startsOn: new Date('2026-09-01T00:00:00.000Z'),
                endsOn: new Date('2026-11-30T00:00:00.000Z'),
                activatedAt: new Date('2026-09-01T12:00:00.000Z'),
              },
        },
      },
      select: {
        id: true,
        account: { select: { id: true } },
        subscriptions: { select: { id: true } },
      },
    });
    const accountId = created.account!.id;
    return {
      clientId: created.id,
      accountId,
      email,
      subscriptionId: created.subscriptions[0]?.id ?? '',
      principal: {
        accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: created.id },
      },
    };
  };

  const newSession = async ({
    capacity = 8,
    startsAt = new Date(closureNow.getTime() + 24 * 60 * 60 * 1_000),
  }) => {
    const trainer = await prisma.staffMember.create({
      data: { name: 'Trainer', role: 'TRAINER' },
    });
    // Its own Branch: two Sessions of one Branch may not overlap.
    const branch = await prisma.branch.create({
      data: { name: randomUUID(), address: 'Calle Uno' },
    });
    const session = await prisma.session.create({
      data: {
        branchId: branch.id,
        classTypeId: classType.id,
        trainerStaffMemberId: trainer.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
        capacity,
      },
      select: { id: true },
    });
    return session.id;
  };

  const backdate = async (clientId: string) => {
    const earlier = new Date(closureNow.getTime() - 60 * 60 * 1_000);
    await prisma.booking.updateMany({
      where: { clientId },
      data: { createdAt: earlier },
    });
    await prisma.waitlistEntry.updateMany({
      where: { clientId },
      data: { joinedAt: earlier },
    });
  };

  return {
    ...world,
    backdate,
    administrator: await world.principalOf('paola.mendoza@example.com'),
    newClient,
    newSession,
  };
};
