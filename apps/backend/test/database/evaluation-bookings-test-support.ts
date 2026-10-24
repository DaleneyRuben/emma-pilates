import { randomUUID } from 'node:crypto';
import type { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import type { PrismaClient } from '../../src/generated/prisma/client';
import {
  branchIdOf,
  codeOf,
  EvaluationTestWorld,
} from './evaluation-test-support';

type EvaluationCommands = ReturnType<typeof createPrismaEvaluationCommands>;

export const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
export const at = (instant: string): Date => new Date(instant);

export const slotIdAt = async (
  prisma: PrismaClient,
  availabilityBlockId: string,
  startsAt: string,
) =>
  (
    await prisma.evaluationSlot.findUniqueOrThrow({
      where: {
        availabilityBlockId_startsAt: {
          availabilityBlockId,
          startsAt: at(startsAt),
        },
      },
      select: { id: true },
    })
  ).id;

export const notificationsTo = (
  prisma: PrismaClient,
  email: string,
  type: string,
) =>
  prisma.notification.findMany({
    where: { account: { email }, type },
    select: {
      category: true,
      businessEventKey: true,
      title: true,
      message: true,
      destinationType: true,
      destinationId: true,
    },
  });

export const settle = async <T>(work: Promise<T>) =>
  work.then(
    (value) => ({ ok: true as const, value }),
    async (error: unknown) => ({
      ok: false as const,
      code: await codeOf(Promise.reject(error as Error)),
    }),
  );

// Carla's Monday morning and Wednesday evening blocks at Centro, the slots
// every evaluation booking spec books from.
export const createCarlaBlocks = async (
  world: EvaluationTestWorld,
  commands: EvaluationCommands,
) => {
  const carla = await world.principalOf('carla@example.com');
  const block = async (
    weekday: number,
    startsAtLocal: string,
    endsAtLocal: string,
  ) =>
    (
      await commands.createAvailabilityBlock(
        {
          branchId: branchIdOf('centro'),
          weekday,
          startsAtLocal,
          endsAtLocal,
          effectiveFrom: civil('2026-09-21'),
        },
        carla,
        randomUUID(),
      )
    ).id;
  return {
    mondayBlockId: await block(1, '09:00', '13:00'),
    wednesdayBlockId: await block(3, '20:15', '21:00'),
  };
};

// The development fixtures give Lucía and Isabel 30-day Plans. NUT-003
// includes the Evaluation only on a 90-day Plan, so these specs grant one.
export const grantQuarterlySubscription = async (
  prisma: PrismaClient,
  email: string,
): Promise<void> => {
  const client = await prisma.client.findFirstOrThrow({
    where: { account: { email, deletedAt: null } },
    select: { id: true },
  });
  const plan = await prisma.plan.findFirstOrThrow({
    where: { durationDays: 90, hiddenAt: null },
    select: { id: true, name: true, classAllowance: true },
  });
  await prisma.subscription.updateMany({
    where: { clientId: client.id, state: 'ACTIVE' },
    data: { state: 'EXPIRED', expiredAt: at('2026-09-21T15:00:00.000Z') },
  });
  await prisma.subscription.create({
    data: {
      clientId: client.id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      durationDaysSnapshot: 90,
      originalClassAllowance: plan.classAllowance,
      remainingClassAllowance: 5,
      startsOn: civil('2026-09-11'),
      endsOn: civil('2026-12-09'),
      activatedAt: at('2026-09-11T16:00:00.000Z'),
    },
  });
};

// Isabel has no classes left; a future booked Session keeps her eligible.
export const bookIsabelFutureSession = async (
  world: EvaluationTestWorld,
): Promise<void> => {
  const isabel = await world.prisma.account.findFirstOrThrow({
    where: { email: 'isabel@example.com', deletedAt: null },
    select: {
      id: true,
      client: {
        select: { id: true, subscriptions: { select: { id: true } } },
      },
    },
  });
  const futureSession = await world.prisma.session.findFirstOrThrow({
    where: {
      state: 'SCHEDULED',
      startsAt: { gt: at('2026-09-22T00:00:00.000Z') },
    },
    orderBy: { startsAt: 'asc' },
    select: { id: true },
  });
  await world.prisma.booking.create({
    data: {
      sessionId: futureSession.id,
      clientId: isabel.client!.id,
      subscriptionId: isabel.client!.subscriptions[0].id,
      createdByAccountId: isabel.id,
    },
  });
};
