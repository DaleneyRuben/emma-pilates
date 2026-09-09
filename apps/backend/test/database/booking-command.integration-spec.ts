import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Booking commands', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('creates a Booking and consumes one allowance atomically', async () => {
    const fixture = await createFixture(prisma);
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);

    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );

    expect(booking.id).toEqual(expect.any(String));

    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
  });
});

const createFixture = async (prisma: PrismaClient) => {
  const now = new Date('2026-09-10T12:00:00Z');
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
      startsAt: new Date('2026-09-10T16:00:00Z'),
      endsAt: new Date('2026-09-10T17:00:00Z'),
      capacity: 8,
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
    sessionId: session.id,
    subscriptionId: subscription.id,
  };
};
