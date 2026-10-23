import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BookingCancellationCause,
  BookingState,
  PrismaClient,
} from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createFixture } from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// Monday 14 September, before every Session the cap cases book.
const now = new Date('2026-09-14T14:00:00.000Z');

const principalFor = (fixture: { accountId: string; clientId: string }) => ({
  accountId: fixture.accountId,
  authenticationSessionId: randomUUID(),
  identity: { kind: 'client' as const, clientId: fixture.clientId },
});

describe('weekly cap', () => {
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

  const anotherSession = async (
    fixture: { sessionId: string },
    startsAt: Date,
    room: string,
  ) => {
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { classTypeId: true, trainerStaffMemberId: true },
    });
    const branch = await prisma.branch.create({
      data: { name: `${room}-${randomUUID()}`, address: 'Calle Uno' },
    });
    const trainer = await prisma.staffMember.create({
      data: { name: room, role: 'TRAINER' },
    });
    return prisma.session.create({
      data: {
        branchId: branch.id,
        classTypeId: session.classTypeId,
        trainerStaffMemberId: trainer.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
        capacity: 8,
      },
      select: { id: true },
    });
  };

  it('refuses a fourth base Booking in the same week and lets an extra class fund it', async () => {
    const fixture = await createFixture(prisma, {
      now,
      startsAt: new Date('2026-10-26T01:00:00.000Z'),
    });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: {
        durationMonthsSnapshot: 3,
        durationDaysSnapshot: 90,
        originalClassAllowance: 16,
        weeklyClassCapSnapshot: 3,
        remainingClassAllowance: 8,
        startsOn: new Date('2026-09-01'),
        endsOn: new Date('2026-11-29'),
      },
    });
    const commands = new PrismaBookingCommands(prisma, () => now);
    const principal = principalFor(fixture);
    const book = async (startsAt: Date, room: string) => {
      const session = await anotherSession(fixture, startsAt, room);
      return commands.create({ sessionId: session.id }, principal);
    };

    await book(new Date('2026-09-15T15:00:00.000Z'), 'a');
    await book(new Date('2026-09-16T15:00:00.000Z'), 'b');
    await book(new Date('2026-09-17T15:00:00.000Z'), 'c');
    await expect(
      book(new Date('2026-09-18T15:00:00.000Z'), 'd'),
    ).rejects.toThrow('Weekly cap reached');

    await prisma.allowanceAdjustment.create({
      data: {
        subscriptionId: fixture.subscriptionId,
        clientId: fixture.clientId,
        classes: 1,
        reason: 'COURTESY',
        authorAccountId: fixture.accountId,
      },
    });
    const funded = await book(new Date('2026-09-18T18:00:00.000Z'), 'e');
    await expect(
      prisma.allowanceAdjustment.findFirst({
        where: {
          subscriptionId: fixture.subscriptionId,
          reason: 'CONSUMPTION',
          bookingId: funded.id,
          deletedAt: null,
        },
      }),
    ).resolves.toEqual(expect.objectContaining({ classes: -1 }));

    await expect(
      book(new Date('2026-09-19T15:00:00.000Z'), 'f'),
    ).rejects.toThrow('Weekly cap reached');
    await expect(
      book(new Date('2026-09-21T15:00:00.000Z'), 'g'),
    ).resolves.toEqual({ id: expect.any(String) as string });
  });

  it('skips a queued Client who reached the cap and promotes the next one', async () => {
    const fixture = await createFixture(prisma, {
      capacity: 1,
      now,
      startsAt: new Date('2026-09-28T15:00:00.000Z'),
    });
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: { remainingClassAllowance: 0 },
    });
    const commands = new PrismaBookingCommands(prisma, () => now);
    await prisma.subscription.update({
      where: { id: fixture.subscriptionId },
      data: { remainingClassAllowance: 1 },
    });
    const holderCreatedAt = new Date();
    const holder = await commands.create(
      { sessionId: fixture.sessionId },
      principalFor(fixture),
    );
    const capped = await createFixture(prisma, { now });
    await prisma.subscription.update({
      where: { id: capped.subscriptionId },
      data: {
        durationMonthsSnapshot: 3,
        durationDaysSnapshot: 90,
        originalClassAllowance: 16,
        weeklyClassCapSnapshot: 3,
        remainingClassAllowance: 8,
        startsOn: new Date('2026-09-01'),
        endsOn: new Date('2026-11-29'),
      },
    });
    for (const startsAt of [
      new Date('2026-09-15T15:00:00.000Z'),
      new Date('2026-09-16T15:00:00.000Z'),
      new Date('2026-09-17T15:00:00.000Z'),
    ]) {
      const session = await anotherSession(
        capped,
        startsAt,
        startsAt.toISOString(),
      );
      await commands.create({ sessionId: session.id }, principalFor(capped));
    }
    await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      principalFor(capped),
    );
    const next = await createFixture(prisma, { now });
    await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      principalFor(next),
    );
    await prisma.booking.update({
      where: { id: holder.id },
      data: {
        state: BookingState.CANCELLED,
        cancelledAt: new Date(holderCreatedAt.getTime() + 1_000),
        cancelledByAccountId: fixture.accountId,
        cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
      },
    });

    const promotions = await commands.promoteWaitlist(fixture.sessionId);

    expect(promotions).toHaveLength(1);
    expect(promotions[0]?.bookingId).toEqual(expect.any(String));
    await expect(
      prisma.waitlistEntry.findFirstOrThrow({
        where: { sessionId: fixture.sessionId, clientId: capped.clientId },
        select: { closedAt: true },
      }),
    ).resolves.toEqual({ closedAt: null });
    await expect(
      prisma.booking.findFirstOrThrow({
        where: { sessionId: fixture.sessionId, state: 'BOOKED' },
        select: { clientId: true },
      }),
    ).resolves.toEqual({ clientId: next.clientId });
  });
});
