import { PrismaClient } from '../../src/generated/prisma/client';
import { findOwnBookingAround } from '../../src/booking/commands/overlapping-booking';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { bookingClock, createFixture } from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const hour = 60 * 60 * 1_000;

type Fixture = Awaited<ReturnType<typeof createFixture>>;

// Walkthrough n.º 1 (C04p, C04q): the class detail knows, when it opens,
// that she booked this class or holds another one at that time, by the same
// overlap rule a Booking is refused with.
describe('her own Booking around a class', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const anotherSession = async (fixture: Fixture, startsAt: Date) => {
    const classType = await prisma.classType.create({
      data: {
        name: 'Mat Pilates',
        description: 'Mat',
        durationMinutes: 60,
        defaultCapacity: 8,
      },
    });
    return prisma.session.create({
      data: {
        branchId: fixture.branchId,
        classTypeId: classType.id,
        trainerStaffMemberId: fixture.trainerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + hour),
        capacity: 8,
      },
      select: { id: true, startsAt: true, endsAt: true },
    });
  };
  const book = (
    fixture: Fixture,
    sessionId: string,
    state: 'BOOKED' | 'CANCELLED' = 'BOOKED',
  ) =>
    prisma.booking.create({
      data: {
        sessionId,
        clientId: fixture.clientId,
        subscriptionId: fixture.subscriptionId,
        createdByAccountId: fixture.accountId,
        state,
        ...(state === 'CANCELLED'
          ? {
              cancelledAt: bookingClock,
              cancelledByAccountId: fixture.accountId,
              cancellationCause: 'CLIENT_REQUEST' as const,
            }
          : {}),
      },
      select: { id: true },
    });
  const around = async (fixture: Fixture) => {
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { id: true, startsAt: true, endsAt: true },
    });
    return findOwnBookingAround(prisma, {
      clientId: fixture.clientId,
      sessionId: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
    });
  };

  it('names this very class when she booked it', async () => {
    const fixture = await createFixture(prisma, { now: bookingClock });
    const booking = await book(fixture, fixture.sessionId);

    await expect(around(fixture)).resolves.toMatchObject({
      relation: 'this_class',
      bookingId: booking.id,
    });
  });

  it('names another class she holds at that time', async () => {
    const fixture = await createFixture(prisma, { now: bookingClock });
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { startsAt: true },
    });
    const other = await anotherSession(
      fixture,
      new Date(session.startsAt.getTime() - 30 * 60 * 1_000),
    );
    const booking = await book(fixture, other.id);

    await expect(around(fixture)).resolves.toEqual({
      relation: 'overlapping',
      bookingId: booking.id,
      classTypeName: 'Mat Pilates',
      startsAt: other.startsAt,
      endsAt: other.endsAt,
    });
  });

  it('ignores a cancelled booking and a class right after', async () => {
    const fixture = await createFixture(prisma, { now: bookingClock });
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { endsAt: true },
    });
    await book(fixture, fixture.sessionId, 'CANCELLED');
    const after = await anotherSession(fixture, session.endsAt);
    await book(fixture, after.id);

    await expect(around(fixture)).resolves.toBeNull();
  });
});
