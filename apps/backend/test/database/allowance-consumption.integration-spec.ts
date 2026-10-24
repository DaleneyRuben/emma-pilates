import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { readExtraClasses } from '../../src/booking/commands/consume-allowance';
import {
  bookingClock as clock,
  createFixture,
} from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('extra class consumption', () => {
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

  it('spends the base allowance before an extra class, then the extra once', async () => {
    const fixture = await createFixture(prisma, { now: clock });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: { remainingClassAllowance: 1 },
    });
    await prisma.allowanceAdjustment.create({
      data: {
        subscriptionId: fixture.subscriptionId,
        clientId: fixture.clientId,
        classes: 1,
        reason: 'GIFT_NEW_CLIENT',
        authorAccountId: fixture.accountId,
        createdAt: clock,
      },
    });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const principal = {
      accountId: fixture.accountId,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: fixture.clientId },
    };
    const book = () =>
      commands.create({ sessionId: fixture.sessionId }, principal);

    await book();
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 0 });
    await expect(
      prisma.$transaction((transaction) =>
        readExtraClasses(transaction, fixture.subscriptionId),
      ),
    ).resolves.toBe(1);

    const session = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { branchId: true, classTypeId: true, trainerStaffMemberId: true },
    });
    const second = await prisma.session.create({
      data: {
        ...session,
        startsAt: new Date(clock.getTime() + 26 * 60 * 60 * 1_000),
        endsAt: new Date(clock.getTime() + 27 * 60 * 60 * 1_000),
        capacity: 8,
      },
      select: { id: true },
    });
    await commands.create({ sessionId: second.id }, principal);

    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 0 });
    await expect(
      prisma.$transaction((transaction) =>
        readExtraClasses(transaction, fixture.subscriptionId),
      ),
    ).resolves.toBe(0);

    const third = await prisma.session.create({
      data: {
        ...session,
        startsAt: new Date(clock.getTime() + 50 * 60 * 60 * 1_000),
        endsAt: new Date(clock.getTime() + 51 * 60 * 60 * 1_000),
        capacity: 8,
      },
      select: { id: true },
    });
    await expect(
      commands.create({ sessionId: third.id }, principal),
    ).rejects.toThrow('No eligible Subscription');
  });
});
