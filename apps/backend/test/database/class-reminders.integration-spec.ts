import { jest } from '@jest/globals';
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

const boliviaClock = (instant: Date): string => {
  const parts = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const field = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${field('hour')}:${field('minute')}`;
};
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

  // Booked straight in the table: the reminder does not care how, and the
  // fixture Plan has no classes left for the later cases.
  const bookDirectly = async (
    principal: AuthenticatedPrincipal,
    startsAt: Date,
  ) => {
    if (principal.identity.kind !== 'client') throw new Error('not a Client');
    const { clientId } = principal.identity;
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { clientId },
      select: { id: true },
    });
    return prisma.booking.create({
      data: {
        sessionId: (await createSession(startsAt)).id,
        clientId,
        subscriptionId: subscription.id,
        createdByAccountId: principal.accountId,
        createdAt: new Date(startsAt.getTime() - 48 * hour),
      },
    });
  };

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
        message: `Mañana tienes ${classType.name} a las ${boliviaClock(startsAt)}.`,
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
        message: `Hoy tienes ${classType.name} a las ${boliviaClock(startsAt)}.`,
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

  it('sends the hour reminder as Hoy when the class is later the same Bolivia day', async () => {
    const lucia = await principalOf('lucia@example.com');
    const startsAt = new Date(base.getTime() + 120 * hour);
    const session = await createSession(startsAt);
    const booking = await bookings.create({ sessionId: session.id }, lucia);

    clock = new Date(startsAt.getTime() - 90 * minute);
    await expect(job().execute()).resolves.toEqual({ sent: 1 });
    await expect(
      prisma.notification.findFirstOrThrow({
        where: { businessEventKey: `class-reminder-hour:${booking.id}` },
      }),
    ).resolves.toMatchObject({
      message: `Hoy tienes ${classType.name} a las ${boliviaClock(startsAt)}.`,
    });
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

  it('opens no transaction once the due reminder was sent', async () => {
    const lucia = await principalOf('lucia@example.com');
    const startsAt = new Date(base.getTime() + 200 * hour);
    await bookDirectly(lucia, startsAt);
    clock = new Date(startsAt.getTime() - 20 * hour);
    await expect(job().execute()).resolves.toEqual({ sent: 1 });
    const transactions = jest.spyOn(prisma, '$transaction');

    try {
      clock = new Date(startsAt.getTime() - 10 * hour);
      await expect(job().execute()).resolves.toEqual({ sent: 0 });
      expect(transactions).not.toHaveBeenCalled();
    } finally {
      transactions.mockRestore();
    }
  });

  it('sends the other reminders when one cannot be recorded, then reports it', async () => {
    const lucia = await principalOf('lucia@example.com');
    const first = new Date(base.getTime() + 150 * hour);
    const broken = await bookDirectly(lucia, first);
    const fine = await bookDirectly(lucia, new Date(first.getTime() + hour));
    clock = new Date(first.getTime() - hour);

    await expect(
      createClassReminderJob(
        prisma,
        () => clock,
        (transaction, notice) =>
          notice.businessEventKey.endsWith(broken.id)
            ? Promise.reject(new Error('notice broke'))
            : recordNotification(transaction, notice),
      ).execute(),
    ).rejects.toThrow(`class_reminders failed for 1 item: ${broken.id}`);
    await expect(
      prisma.notification.findMany({
        where: { businessEventKey: { endsWith: fine.id } },
        select: { type: true },
      }),
    ).resolves.toEqual([{ type: 'class_reminder_hour' }]);
  });
});
