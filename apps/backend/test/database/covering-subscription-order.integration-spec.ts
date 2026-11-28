import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { openGuestPass } from '../../src/booking/payments/open-guest-pass';
import { createFixture } from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// Owner's decision of 2026-11-28: when a Guest Pass and a paid Plan both
// cover the class's day, the Booking uses the paid Plan; the Guest Pass only
// funds a class no paid Plan covers.
describe('which covering Subscription a Booking uses', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const now = new Date('2026-09-15T14:00:00.000Z'); // 10:00 in Bolivia

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const giveGuestPass = async (
    fixture: { clientId: string; accountId: string },
    openedAt: string,
  ) => {
    const host = await prisma.client.create({
      data: { name: 'Anfitriona', referralCode: `REF-${randomUUID()}` },
    });
    await prisma.$transaction((transaction) =>
      openGuestPass(transaction, {
        hostClientId: host.id,
        friendClientId: fixture.clientId,
        authorAccountId: fixture.accountId,
        now: new Date(openedAt),
      }),
    );
  };

  // Bought ahead of its start, as an Early Renewal is: the database holds one
  // current and one future Subscription, never two current ones.
  const buyPlan = async (
    fixture: { clientId: string },
    boughtAt: string,
    startsOn: string,
  ): Promise<string> => {
    const plan = await prisma.plan.create({
      data: {
        name: randomUUID(),
        durationDays: 30,
        classAllowance: 2,
        priceCentavos: 10000,
        displayOrder: 0,
      },
    });
    const subscription = await prisma.subscription.create({
      data: {
        clientId: fixture.clientId,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationDaysSnapshot: 30,
        originalClassAllowance: 2,
        remainingClassAllowance: 2,
        startsOn: new Date(startsOn),
        endsOn: new Date('2026-10-30'),
        activatedAt: new Date(boughtAt),
      },
    });
    return subscription.id;
  };

  const book = async (fixture: {
    sessionId: string;
    clientId: string;
    accountId: string;
  }) => {
    const booking = await new PrismaBookingCommands(prisma, () => now).create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );
    const [{ subscriptionId }, pass] = await Promise.all([
      prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
        select: { subscriptionId: true },
      }),
      prisma.guestPass.findFirstOrThrow({
        where: { friendClientId: fixture.clientId, deletedAt: null },
        select: { bookingId: true },
      }),
    ]);
    return { bookingId: booking.id, subscriptionId, pass };
  };

  // The fixture's own Plan ends before anything below, so each case decides
  // which covering Subscription exists first.
  const withoutFixturePlan = async () => {
    const fixture = await createFixture(prisma, { now });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: { endsOn: new Date('2026-09-02') },
    });
    return fixture;
  };

  it('uses the paid Plan bought after the Guest Pass', async () => {
    const fixture = await withoutFixturePlan();
    await giveGuestPass(fixture, '2026-09-10T14:00:00.000Z');
    const planId = await buyPlan(
      fixture,
      '2026-09-12T14:00:00.000Z',
      '2026-09-15',
    );

    const booked = await book(fixture);

    expect(booked.subscriptionId).toBe(planId);
    expect(booked.pass).toEqual({ bookingId: null });
  });

  it('uses the paid Plan held before the Guest Pass', async () => {
    const fixture = await withoutFixturePlan();
    const planId = await buyPlan(
      fixture,
      '2026-09-05T14:00:00.000Z',
      '2026-09-15',
    );
    await giveGuestPass(fixture, '2026-09-10T14:00:00.000Z');

    const booked = await book(fixture);

    expect(booked.subscriptionId).toBe(planId);
    expect(booked.pass).toEqual({ bookingId: null });
  });

  it('lets the Guest Pass fund a class no paid Plan covers yet', async () => {
    const fixture = await withoutFixturePlan();
    await giveGuestPass(fixture, '2026-09-10T14:00:00.000Z');
    const planId = await buyPlan(
      fixture,
      '2026-09-12T14:00:00.000Z',
      '2026-09-16',
    );

    const booked = await book(fixture);

    expect(booked.subscriptionId).not.toBe(planId);
    expect(booked.pass).toEqual({ bookingId: booked.bookingId });
  });
});
