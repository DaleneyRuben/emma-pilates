import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { createClassReminderJob } from '../../src/notifications/class-reminder-job';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../src/time/bolivia-time';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const hour = 60 * 60 * 1_000;
const minute = 60 * 1_000;
// Bookings take the database clock, so every Session starts well after it.
const base = new Date(Math.ceil(Date.now() / hour) * hour + 30 * hour);

describe('class reminder worker', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let bookings: PrismaBookingCommands;
  let clock: Date;
  const fixtures = buildDevelopmentFixtures({ today: boliviaDate(new Date()) });
  const trainer = fixtures.staffMembers.find(
    (member) => member.email === 'emma.vargas@example.com',
  )!;
  const classType = fixtures.classTypes[0];

  const job = () =>
    createClassReminderJob(prisma, () => clock, recordNotification);

  const principalOf = async (
    email: string,
  ): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { id: true, clientId: true },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
    };
  };

  const createSession = (startsAt: Date) =>
    prisma.session.create({
      data: {
        branchId: trainer.branchIds[0],
        classTypeId: classType.id,
        trainerStaffMemberId: trainer.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 50 * minute),
        capacity: 10,
      },
    });

  const remindersOf = (accountId: string) =>
    prisma.notification.findMany({
      where: {
        accountId,
        type: { in: ['class_reminder_day', 'class_reminder_hour'] },
      },
      orderBy: { businessEventKey: 'asc' },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    await prisma.session.deleteMany();
    bookings = new PrismaBookingCommands(prisma, () => new Date());
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('records the day reminder once when the worker restarts inside its window', async () => {
    const lucia = await principalOf('lucia@example.com');
    const startsAt = new Date(base.getTime() + 26 * hour);
    const session = await createSession(startsAt);
    const booking = await bookings.create({ sessionId: session.id }, lucia);

    clock = new Date(startsAt.getTime() - 24 * hour);
    await expect(job().execute()).resolves.toEqual({ sent: 1 });
    // A restart in the middle of the same window must not send it again.
    clock = new Date(startsAt.getTime() - 10 * hour);
    await expect(job().execute()).resolves.toEqual({ sent: 0 });

    const reminders = await remindersOf(lucia.accountId);
    expect(reminders).toEqual([
      expect.objectContaining({
        category: 'REMINDER',
        type: 'class_reminder_day',
        businessEventKey: `class-reminder-day:${booking.id}`,
        title: 'Recordatorio',
        message: `Mañana tienes ${classType.name} a las 02:00.`,
        destinationType: 'booking',
        destinationId: booking.id,
      }),
    ]);
  });

  it('records the hour reminder once and leaves a cancelled Booking alone', async () => {
    const lucia = await principalOf('lucia@example.com');
    const startsAt = new Date(base.getTime() + 50 * hour);
    const session = await createSession(startsAt);
    const booked = await bookings.create({ sessionId: session.id }, lucia);
    const cancelled = await bookings.create(
      {
        sessionId: (
          await createSession(new Date(startsAt.getTime() + 2 * hour))
        ).id,
      },
      lucia,
    );
    await bookings.cancel({ bookingId: cancelled.id }, lucia);

    clock = new Date(startsAt.getTime() - 2 * hour);
    await expect(job().execute()).resolves.toEqual({ sent: 1 });
    await expect(job().execute()).resolves.toEqual({ sent: 0 });

    await expect(
      prisma.notification.findMany({
        where: {
          accountId: lucia.accountId,
          businessEventKey: `class-reminder-hour:${booked.id}`,
        },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        type: 'class_reminder_hour',
        message: `Tu clase de ${classType.name} empieza en 2 horas.`,
        destinationId: booked.id,
      }),
    ]);
    await expect(
      prisma.notification.findMany({
        where: {
          accountId: lucia.accountId,
          businessEventKey: `class-reminder-hour:${cancelled.id}`,
        },
      }),
    ).resolves.toEqual([]);
  });

  it('does not send a day reminder for a Booking made inside the day window', async () => {
    const lucia = await principalOf('lucia@example.com');
    const startsAt = new Date(base.getTime() + 80 * hour);
    const session = await createSession(startsAt);
    const booking = await bookings.create({ sessionId: session.id }, lucia);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { createdAt: new Date(startsAt.getTime() - 20 * hour) },
    });

    clock = new Date(startsAt.getTime() - 3 * hour);
    await expect(job().execute()).resolves.toEqual({ sent: 0 });
    await expect(
      prisma.notification.findMany({
        where: {
          accountId: lucia.accountId,
          businessEventKey: { contains: booking.id },
        },
      }),
    ).resolves.toEqual([]);
  });
});
