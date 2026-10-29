import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { readExtraClasses } from '../../src/booking/commands/consume-allowance';
import { cancelBelowMinimum } from '../../src/booking/sessions/prisma-minimum-bookings-cancellation';
import {
  bookingClock as clock,
  createClientWithSubscription,
  createFixture,
} from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// FIX-005: an extra-funded class returns to the extra pool, never to the
// base allowance. Returning it to the base can break remaining <= original
// and give a 500, including inside the minimum-bookings worker. A same-week
// reschedule moves the consumption; it does not spend another extra class.
describe('extra-funded refund and reschedule', () => {
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

  const principalFor = (fixture: { accountId: string; clientId: string }) => ({
    accountId: fixture.accountId,
    authenticationSessionId: randomUUID(),
    identity: { kind: 'client' as const, clientId: fixture.clientId },
  });

  const laterSession = async (
    fixture: { sessionId: string },
    startsAt: Date,
  ) => {
    const source = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { branchId: true, classTypeId: true, trainerStaffMemberId: true },
    });
    return prisma.session.create({
      data: {
        ...source,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
        capacity: 8,
      },
      select: { id: true },
    });
  };

  const grantExtra = (fixture: {
    subscriptionId: string;
    clientId: string;
    accountId: string;
  }) =>
    prisma.allowanceAdjustment.create({
      data: {
        subscriptionId: fixture.subscriptionId,
        clientId: fixture.clientId,
        classes: 1,
        reason: 'GIFT_NEW_CLIENT',
        authorAccountId: fixture.accountId,
        createdAt: clock,
      },
    });

  const extraOf = (subscriptionId: string) =>
    prisma.$transaction((transaction) =>
      readExtraClasses(transaction, subscriptionId),
    );

  it('returns a cancelled extra-funded class to the extra pool, not the base', async () => {
    const fixture = await createFixture(prisma, { now: clock });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: { remainingClassAllowance: 0 },
    });
    await grantExtra(fixture);
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      principalFor(fixture),
    );

    await commands.cancel({ bookingId: booking.id }, principalFor(fixture));

    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 0 });
    await expect(extraOf(fixture.subscriptionId)).resolves.toBe(1);
    await expect(
      prisma.allowanceAdjustment.count({
        where: {
          subscriptionId: fixture.subscriptionId,
          reason: 'CONSUMPTION',
          deletedAt: null,
          classes: { lt: 0 },
        },
      }),
    ).resolves.toBe(0);
  });

  it('returns an extra-funded class the minimum-bookings worker cancels without breaking the allowance check', async () => {
    const fixture = await createFixture(prisma, {
      capacity: 4,
      now: clock,
      startsAt: new Date(clock.getTime() + 4 * 60 * 60 * 1_000),
    });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: { remainingClassAllowance: 0 },
    });
    await grantExtra(fixture);
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      principalFor(fixture),
    );

    await prisma.$transaction((transaction) =>
      cancelBelowMinimum(
        transaction,
        {
          id: fixture.sessionId,
          branchId: fixture.branchId,
          startsAt: new Date(clock.getTime() + 4 * 60 * 60 * 1_000),
          classType: { name: 'Reformer' },
          trainer: { account: null },
          bookings: [
            {
              id: booking.id,
              clientId: fixture.clientId,
              subscriptionId: fixture.subscriptionId,
              client: { account: { id: fixture.accountId } },
            },
          ],
          waitlistEntries: [],
        },
        {
          now: new Date(),
          minimumBookings: 2,
          recordNotification: () => Promise.resolve(),
        },
      ),
    );

    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 0 });
    await expect(extraOf(fixture.subscriptionId)).resolves.toBe(1);
  });

  it('moves the consumption when an extra-funded class is rescheduled, without spending another extra', async () => {
    const startsAt = new Date('2026-09-15T16:30:00.000Z');
    const fixture = await createFixture(prisma, {
      now: new Date('2026-09-15T15:00:00.000Z'),
      startsAt,
    });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: {
        remainingClassAllowance: 0,
        durationDaysSnapshot: 60,
        weeklyClassCapSnapshot: 3,
      },
    });
    await grantExtra(fixture);
    const commands = new PrismaBookingCommands(
      prisma,
      () => new Date('2026-09-15T15:00:00.000Z'),
    );
    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      principalFor(fixture),
    );
    const target = await laterSession(
      fixture,
      new Date('2026-09-15T18:00:00.000Z'),
    );

    const moved = await commands.reschedule(
      { bookingId: booking.id, targetSessionId: target.id },
      principalFor(fixture),
    );

    await expect(extraOf(fixture.subscriptionId)).resolves.toBe(0);
    await expect(
      prisma.allowanceAdjustment.findFirst({
        where: {
          subscriptionId: fixture.subscriptionId,
          reason: 'CONSUMPTION',
          bookingId: moved.id,
          deletedAt: null,
        },
      }),
    ).resolves.toEqual(expect.objectContaining({ classes: -1 }));
    await expect(
      prisma.allowanceAdjustment.count({
        where: {
          subscriptionId: fixture.subscriptionId,
          reason: 'CONSUMPTION',
          bookingId: booking.id,
          deletedAt: null,
        },
      }),
    ).resolves.toBe(0);
  });

  it('lets another Client book when a queued Client has only a spent extra class', async () => {
    const fixture = await createFixture(prisma, { capacity: 1, now: clock });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const holder = await commands.create(
      { sessionId: fixture.sessionId },
      principalFor(fixture),
    );
    const spent = await createClientWithSubscription(prisma);
    await prisma.subscription.update({
      where: { id: spent.subscriptionId },
      data: { remainingClassAllowance: 0 },
    });
    await prisma.allowanceAdjustment.create({
      data: {
        subscriptionId: spent.subscriptionId,
        clientId: spent.clientId,
        classes: 1,
        reason: 'GIFT_NEW_CLIENT',
        authorAccountId: spent.accountId,
        createdAt: clock,
      },
    });
    await prisma.allowanceAdjustment.create({
      data: {
        subscriptionId: spent.subscriptionId,
        clientId: spent.clientId,
        classes: -1,
        reason: 'CONSUMPTION',
        authorAccountId: spent.accountId,
        createdAt: clock,
      },
    });
    await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      principalFor(spent),
    );
    const next = await createClientWithSubscription(prisma);
    await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      principalFor(next),
    );

    await commands.cancel({ bookingId: holder.id }, principalFor(fixture));

    await expect(
      prisma.booking.findFirst({
        where: {
          sessionId: fixture.sessionId,
          clientId: next.clientId,
          state: 'BOOKED',
        },
      }),
    ).resolves.toEqual(expect.objectContaining({ clientId: next.clientId }));
    await expect(
      prisma.waitlistEntry.findFirstOrThrow({
        where: { sessionId: fixture.sessionId, clientId: spent.clientId },
        select: { closedAt: true },
      }),
    ).resolves.toEqual({ closedAt: null });
  });
});
