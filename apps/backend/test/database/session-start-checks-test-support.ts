import { randomUUID } from 'node:crypto';
import { PrismaClient, type Prisma } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaSessionStartChecks } from '../../src/booking/sessions/prisma-session-start-checks';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { NotificationRecorder } from '../../src/notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../src/time/bolivia-time';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

export const hour = 60 * 60 * 1_000;
export const minute = 60 * 1_000;

// Bookings and Waitlist Entries take the database clock, so every Session
// starts a few hours after the real clock and each test gets its own 4-hour
// slot: one slot's check window never reaches another slot's Session.
const base = new Date(Math.ceil(Date.now() / hour) * hour + 4 * hour);
export const slotStart = (slot: number) =>
  new Date(base.getTime() + slot * 4 * hour);

export type ClientPrincipal = AuthenticatedPrincipal & { clientId: string };

// One database with the development fixtures and no Sessions, shared by the
// Session start check specs (BOOK-004, BKM-009).
export const startSessionStartChecksWorld = async () => {
  const context: DatabaseTestContext = await startDatabaseTestContext();
  const prisma = new PrismaClient({
    adapter: createPrismaAdapter(context.databaseUrl),
  });
  const fixtures = buildDevelopmentFixtures({ today: boliviaDate(new Date()) });
  await applyDevelopmentFixtures(prisma, {
    fixtures,
    passwordHash: 'not-a-real-hash',
  });
  // The sweeps scan every Session, so keep only the ones each test creates.
  await prisma.session.deleteMany();
  // Every active Plan starts full, so the specs never run out of classes.
  await prisma.$executeRaw`
    UPDATE booking.subscriptions
    SET remaining_class_allowance = original_class_allowance
    WHERE state = 'active'`;
  const trainer = fixtures.staffMembers.find(
    (member) => member.email === 'emma.vargas@example.com',
  )!;
  const classType = fixtures.classTypes[0];
  const bookings = new PrismaBookingCommands(prisma, () => new Date());
  let clock = new Date();

  const accountIdOf = async (email: string) =>
    (
      await prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
      })
    ).id;

  const principalOf = async (email: string): Promise<ClientPrincipal> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { id: true, clientId: true },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
      clientId: account.clientId!,
    };
  };

  const createSession = (startsAt: Date, capacity = 10) =>
    prisma.session.create({
      data: {
        branchId: trainer.branchIds[0],
        classTypeId: classType.id,
        trainerStaffMemberId: trainer.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 50 * minute),
        capacity,
      },
    });

  const book = async (sessionId: string, ...clients: ClientPrincipal[]) => {
    const booked: { id: string }[] = [];
    for (const client of clients) {
      booked.push(await bookings.create({ sessionId }, client));
    }
    return booked;
  };

  const joinWaitlist = (sessionId: string, client: ClientPrincipal) =>
    prisma.waitlistEntry.create({
      data: {
        sessionId,
        clientId: client.clientId,
        joinedByAccountId: client.accountId,
      },
    });

  const sessionCancelledNotices = async (email: string) =>
    prisma.notification.findMany({
      where: { accountId: await accountIdOf(email), type: 'session_cancelled' },
      orderBy: { createdAt: 'asc' },
    });

  const remainingAllowance = async (client: ClientPrincipal) =>
    (
      await prisma.subscription.findFirstOrThrow({
        where: { clientId: client.clientId, state: 'ACTIVE' },
        orderBy: { endsOn: 'desc' },
      })
    ).remainingClassAllowance;

  // A new Studio Settings version, as BKM-004's administrator update writes it.
  const setStudioSettings = async (
    changes: Partial<
      Pick<
        Prisma.StudioSettingsVersionCreateInput,
        'minimumBookings' | 'cancellationWindowMinutes'
      >
    >,
  ) => {
    const current = await prisma.studioSettingsVersion.findFirstOrThrow({
      orderBy: { version: 'desc' },
    });
    const { id, createdAt, ...values } = current;
    void id;
    void createdAt;
    await prisma.studioSettingsVersion.create({
      data: {
        ...values,
        ...changes,
        version: current.version + 1,
        createdByAccountId: await accountIdOf('paola.mendoza@example.com'),
      },
    });
  };

  return {
    prisma,
    trainer,
    classType,
    bookings,
    setClock: (instant: Date) => {
      clock = instant;
    },
    checks: (recorder?: NotificationRecorder) =>
      createPrismaSessionStartChecks(prisma, {
        now: () => clock,
        recordNotification: recorder,
      }),
    accountIdOf,
    principalOf,
    createSession,
    book,
    joinWaitlist,
    sessionCancelledNotices,
    remainingAllowance,
    setStudioSettings,
    stop: async () => {
      await prisma.$disconnect();
      await context.stop();
    },
  };
};

export type SessionStartChecksWorld = Awaited<
  ReturnType<typeof startSessionStartChecksWorld>
>;
