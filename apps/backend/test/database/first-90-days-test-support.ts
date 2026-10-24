import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';

export const first90DaysNow = new Date('2026-10-08T16:00:00.000Z');

export const createPlan = (
  prisma: PrismaClient,
  extra: { priceCentavos?: number; hiddenAt?: Date | null } = {},
) =>
  prisma.plan.create({
    data: {
      name: randomUUID(),
      durationDays: 30,
      classAllowance: 8,
      priceCentavos: extra.priceCentavos ?? 56_000,
      displayOrder: 0,
      hiddenAt: extra.hiddenAt ?? null,
    },
  });

export const createClientWithPlan = async (
  prisma: PrismaClient,
  input: {
    name: string;
    startsOn: Date;
    priceCentavos?: number;
    hiddenAt?: Date | null;
    phone?: string | null;
  },
) => {
  const plan = await createPlan(prisma, {
    priceCentavos: input.priceCentavos,
    hiddenAt: input.hiddenAt,
  });
  const client = await prisma.client.create({
    data: {
      name: input.name,
      phone: input.phone ?? '+591 70011005',
      referralCode: randomUUID(),
    },
  });
  const account = await prisma.account.create({
    data: { email: `${randomUUID()}@example.com`, clientId: client.id },
  });
  const subscription = await prisma.subscription.create({
    data: {
      clientId: client.id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      durationDaysSnapshot: 30,
      originalClassAllowance: 8,
      remainingClassAllowance: 8,
      startsOn: input.startsOn,
      endsOn: new Date(input.startsOn.getTime() + 29 * 24 * 60 * 60 * 1_000),
      activatedAt: input.startsOn,
    },
  });
  return {
    clientId: client.id,
    accountId: account.id,
    subscriptionId: subscription.id,
  };
};

export const createBookedSession = async (
  prisma: PrismaClient,
  input: {
    clientId: string;
    subscriptionId: string;
    accountId: string;
    createdAt: Date;
    startsAt: Date;
  },
) => {
  const branch = await prisma.branch.create({
    data: { name: randomUUID(), address: 'Calle Uno' },
  });
  const trainer = await prisma.staffMember.create({
    data: { name: 'Trainer', role: 'TRAINER' },
  });
  const classType = await prisma.classType.create({
    data: {
      name: randomUUID(),
      description: 'Clase',
      defaultCapacity: 8,
    },
  });
  const session = await prisma.session.create({
    data: {
      branchId: branch.id,
      classTypeId: classType.id,
      trainerStaffMemberId: trainer.id,
      startsAt: input.startsAt,
      endsAt: new Date(input.startsAt.getTime() + 60 * 60 * 1_000),
      capacity: 8,
    },
  });
  return prisma.booking.create({
    data: {
      sessionId: session.id,
      clientId: input.clientId,
      subscriptionId: input.subscriptionId,
      createdByAccountId: input.accountId,
      createdAt: input.createdAt,
    },
  });
};
