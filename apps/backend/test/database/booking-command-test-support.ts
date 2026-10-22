import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';

// Every case runs on an injected clock: the Subscriptions below cover a fixed
// month, so the Sessions built from the clock must fall inside it.
export const bookingClock = new Date('2026-09-15T14:00:00.000Z'); // 10:00 in Bolivia

export const createFixture = async (
  prisma: PrismaClient,
  options: { capacity?: number; startsAt?: Date; now: Date },
) => {
  const now = options.now;
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
      durationMinutes: 60,
      defaultCapacity: 8,
    },
  });
  const session = await prisma.session.create({
    data: {
      branchId: branch.id,
      classTypeId: classType.id,
      trainerStaffMemberId: trainer.id,
      startsAt:
        options.startsAt ?? new Date(now.getTime() + 4 * 60 * 60 * 1_000),
      endsAt: new Date(
        (
          options.startsAt ?? new Date(now.getTime() + 4 * 60 * 60 * 1_000)
        ).getTime() +
          60 * 60 * 1_000,
      ),
      capacity: options.capacity ?? 8,
    },
  });
  const client = await prisma.client.create({
    data: { name: 'Ana', referralCode: randomUUID() },
  });
  const account = await prisma.account.create({
    data: { email: `${randomUUID()}@example.com`, clientId: client.id },
  });
  const plan = await prisma.plan.create({
    data: {
      name: randomUUID(),
      durationMonths: 1,
      classAllowance: 2,
      priceCentavos: 10000,
      displayOrder: 0,
    },
  });
  const subscription = await prisma.subscription.create({
    data: {
      clientId: client.id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      durationMonthsSnapshot: 1,
      originalClassAllowance: 2,
      remainingClassAllowance: 2,
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-09-30'),
      activatedAt: now,
    },
  });

  return {
    now,
    accountId: account.id,
    clientId: client.id,
    branchId: branch.id,
    trainerId: trainer.id,
    sessionId: session.id,
    subscriptionId: subscription.id,
  };
};

export const createClientWithSubscription = async (prisma: PrismaClient) => {
  const client = await prisma.client.create({
    data: { name: 'Bea', referralCode: randomUUID() },
  });
  const account = await prisma.account.create({
    data: { email: `${randomUUID()}@example.com`, clientId: client.id },
  });
  const plan = await prisma.plan.create({
    data: {
      name: randomUUID(),
      durationMonths: 1,
      classAllowance: 2,
      priceCentavos: 10000,
      displayOrder: 0,
    },
  });
  const subscription = await prisma.subscription.create({
    data: {
      clientId: client.id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      durationMonthsSnapshot: 1,
      originalClassAllowance: 2,
      remainingClassAllowance: 2,
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-09-30'),
      activatedAt: new Date('2026-09-10T12:00:00Z'),
    },
  });

  return {
    accountId: account.id,
    clientId: client.id,
    subscriptionId: subscription.id,
  };
};
