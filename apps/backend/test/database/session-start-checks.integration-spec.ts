import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaSessionStartChecks } from '../../src/booking/sessions/prisma-session-start-checks';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  recordNotification,
  type NotificationRecorder,
} from '../../src/notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../src/time/bolivia-time';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const hour = 60 * 60 * 1_000;
const minute = 60 * 1_000;
// Bookings and Waitlist Entries take the database clock, so every Session
// starts a few hours after the real clock and each test gets its own 4-hour
// slot: one slot's check window never reaches another slot's Session.
const base = new Date(Math.ceil(Date.now() / hour) * hour + 3 * hour);
const slotStart = (slot: number) => new Date(base.getTime() + slot * 4 * hour);

describe('Prisma Session start checks', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let bookings: PrismaBookingCommands;
  let clock: Date;
  const fixtures = buildDevelopmentFixtures({ today: boliviaDate(new Date()) });
  const trainer = fixtures.staffMembers.find(
    (member) => member.email === 'emma.vargas@example.com',
  )!;
  const classType = fixtures.classTypes[0];

  const checks = (recorder?: NotificationRecorder) =>
    createPrismaSessionStartChecks(prisma, {
      now: () => clock,
      recordNotification: recorder,
    });

  const principalOf = async (
    email: string,
  ): Promise<AuthenticatedPrincipal & { clientId: string }> => {
    const account = await prisma.account.findUniqueOrThrow({
      where: { email },
      select: { id: true, clientId: true },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
      clientId: account.clientId!,
    };
  };

  const accountIdOf = async (email: string) =>
    (await prisma.account.findUniqueOrThrow({ where: { email } })).id;

  const createSession = (slot: number, capacity = 10) => {
    const startsAt = slotStart(slot);
    return prisma.session.create({
      data: {
        branchId: trainer.branchIds[0],
        classTypeId: classType.id,
        trainerStaffMemberId: trainer.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 50 * minute),
        capacity,
      },
    });
  };

  const joinWaitlist = (
    sessionId: string,
    client: { clientId: string; accountId: string },
  ) =>
    prisma.waitlistEntry.create({
      data: {
        sessionId,
        clientId: client.clientId,
        joinedByAccountId: client.accountId,
      },
    });

  const trainerNotices = async () =>
    prisma.notification.findMany({
      where: {
        accountId: await accountIdOf(trainer.email),
        type: 'session_cancelled',
      },
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
    // The sweeps scan every Session, so keep only the ones each test creates.
    await prisma.session.deleteMany();
    bookings = new PrismaBookingCommands(prisma, () => new Date());
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('cancels a zero-Booking Session once at the check, closes its Waitlist, and notifies the Trainer and waitlisted Client', async () => {
    const session = await createSession(0);
    const valeria = await principalOf('valeria@example.com');
    const entry = await joinWaitlist(session.id, valeria);
    const due = new Date(session.startsAt.getTime() - 2 * hour);

    clock = new Date(due.getTime() - 1);
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'SCHEDULED',
      emptyBookingCheckCompletedAt: null,
    });

    clock = due;
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 1,
      cancelled: 1,
    });
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'ZERO_BOOKINGS',
      cancelledAt: due,
      cancelledByAccountId: null,
      emptyBookingCheckCompletedAt: due,
    });
    await expect(
      prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({
      closedAt: due,
      closureReason: 'SESSION_CANCELLED',
      closedByAccountId: null,
    });
    const [trainerNotice, ...otherTrainerNotices] = await trainerNotices();
    expect(otherTrainerNotices).toEqual([]);
    expect(trainerNotice).toMatchObject({
      category: 'BOOKING_SCHEDULE',
      title: 'Clase cancelada',
      destinationType: 'trainer_schedule',
      destinationId: null,
    });
    expect(trainerNotice.message).toMatch(
      new RegExp(
        `^Tu clase de ${classType.name} .+ se canceló: no tuvo reservas\\.$`,
      ),
    );
    await expect(
      prisma.notification.findMany({
        where: { accountId: valeria.accountId, type: 'session_cancelled' },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        message: `La clase de ${classType.name} a la que estabas en lista de espera fue cancelada.`,
        destinationType: 'session',
        destinationId: session.id,
      }),
    ]);

    clock = new Date(due.getTime() + minute);
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
    await expect(trainerNotices()).resolves.toHaveLength(1);
  });

  it('leaves a booked Session scheduled and never re-checks it after its Bookings drop to zero', async () => {
    const session = await createSession(1);
    const lucia = await principalOf('lucia@example.com');
    const booking = await bookings.create({ sessionId: session.id }, lucia);
    const due = new Date(session.startsAt.getTime() - 2 * hour);
    const noticesBefore = (await trainerNotices()).length;

    clock = due;
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 1,
      cancelled: 0,
    });
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'SCHEDULED',
      emptyBookingCheckCompletedAt: due,
    });

    await bookings.cancel({ bookingId: booking.id }, lucia);
    clock = new Date(due.getTime() + 30 * minute);
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'SCHEDULED',
      emptyBookingCheckCompletedAt: due,
    });
    await expect(trainerNotices()).resolves.toHaveLength(noticesBefore);
  });

  it('keeps a Session that drops to zero before the check bookable until the check runs', async () => {
    const session = await createSession(2);
    const lucia = await principalOf('lucia@example.com');
    const valeria = await principalOf('valeria@example.com');
    const due = new Date(session.startsAt.getTime() - 2 * hour);

    const first = await bookings.create({ sessionId: session.id }, lucia);
    await bookings.cancel({ bookingId: first.id }, lucia);
    clock = new Date(due.getTime() - minute);
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });

    const second = await bookings.create({ sessionId: session.id }, valeria);
    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: second.id } }),
    ).resolves.toMatchObject({ state: 'BOOKED' });
    await bookings.cancel({ bookingId: second.id }, valeria);

    clock = due;
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 1,
      cancelled: 1,
    });
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'ZERO_BOOKINGS',
    });
  });

  it('ignores a Session an Administrator already cancelled', async () => {
    const session = await createSession(3);
    const administratorAccountId = await accountIdOf(
      'paola.mendoza@example.com',
    );
    const cancelledAt = new Date();
    await prisma.session.update({
      where: { id: session.id },
      data: {
        state: 'CANCELLED',
        cancellationCause: 'NO_SUBSTITUTE_TRAINER',
        cancelledAt,
        cancelledByAccountId: administratorAccountId,
      },
    });
    const noticesBefore = (await trainerNotices()).length;

    clock = new Date(session.startsAt.getTime() - 2 * hour);
    await expect(checks().checkEmptySessions()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'NO_SUBSTITUTE_TRAINER',
      cancelledAt,
      cancelledByAccountId: administratorAccountId,
      emptyBookingCheckCompletedAt: null,
    });
    await expect(trainerNotices()).resolves.toHaveLength(noticesBefore);
  });

  it('closes open Waitlist Entries as session_started once the Session starts, without a notice, exactly once', async () => {
    const session = await createSession(4, 1);
    const lucia = await principalOf('lucia@example.com');
    const valeria = await principalOf('valeria@example.com');
    await bookings.create({ sessionId: session.id }, lucia);
    const entry = await joinWaitlist(session.id, valeria);
    const valeriaNotices = () =>
      prisma.notification.count({ where: { accountId: valeria.accountId } });
    const noticesBefore = await valeriaNotices();

    clock = new Date(session.startsAt.getTime() - 1);
    await expect(checks().closeStartedWaitlists()).resolves.toEqual({
      closed: 0,
    });
    await expect(
      prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({ closedAt: null });

    clock = session.startsAt;
    await expect(checks().closeStartedWaitlists()).resolves.toEqual({
      closed: 1,
    });
    await expect(
      prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({
      closedAt: session.startsAt,
      closureReason: 'SESSION_STARTED',
      closedByAccountId: null,
      promotedBookingId: null,
    });
    await expect(valeriaNotices()).resolves.toBe(noticesBefore);

    clock = new Date(session.startsAt.getTime() + minute);
    await expect(checks().closeStartedWaitlists()).resolves.toEqual({
      closed: 0,
    });
  });

  it('never cancels a Session under a Booking that lands during the check', async () => {
    const session = await createSession(5);
    const lucia = await principalOf('lucia@example.com');
    let landed: PromiseSettledResult<{ id: string }> | undefined;
    // The Booking commits while the check holds the Session row and has
    // already decided to cancel. Booking's foreign key check must not wait on
    // that lock, or this would deadlock instead of retrying.
    const bookDuringCheck: NotificationRecorder = async (
      transaction,
      notice,
    ) => {
      if (landed === undefined) {
        [landed] = await Promise.allSettled([
          bookings.create({ sessionId: session.id }, lucia),
        ]);
      }
      await recordNotification(transaction, notice);
    };

    clock = new Date(session.startsAt.getTime() - 2 * hour);
    await checks(bookDuringCheck).checkEmptySessions();

    const after = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
      include: { bookings: { where: { state: 'BOOKED' } } },
    });
    expect(landed).toBeDefined();
    expect(after.emptyBookingCheckCompletedAt).toEqual(clock);
    if (landed!.status === 'fulfilled') {
      expect(after).toMatchObject({
        state: 'SCHEDULED',
        cancellationCause: null,
      });
      expect(after.bookings.map(({ id }) => id)).toEqual([landed!.value.id]);
    } else {
      expect(after).toMatchObject({
        state: 'CANCELLED',
        cancellationCause: 'ZERO_BOOKINGS',
      });
      expect(after.bookings).toEqual([]);
    }
  });

  it('cancels and notifies once when two workers check the same Session concurrently', async () => {
    const session = await createSession(6);
    const noticesBefore = (await trainerNotices()).length;

    clock = new Date(session.startsAt.getTime() - 2 * hour);
    const results = await Promise.all([
      checks().checkEmptySessions(),
      checks().checkEmptySessions(),
    ]);

    expect(results.reduce((sum, result) => sum + result.cancelled, 0)).toBe(1);
    await expect(
      prisma.session.findUniqueOrThrow({ where: { id: session.id } }),
    ).resolves.toMatchObject({ state: 'CANCELLED' });
    await expect(trainerNotices()).resolves.toHaveLength(noticesBefore + 1);
  });
});
