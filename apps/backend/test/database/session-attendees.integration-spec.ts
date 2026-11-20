import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { nameInitials } from '../../src/booking/client/name-initials';
import { listSessionAvailability } from '../../src/booking/session-availability';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const now = new Date('2026-09-21T12:00:00.000Z');
const week = 7 * 24 * 60 * 60 * 1_000;

// E7: the Assistant's «Hoy» shows who is coming to the next class.
describe('Session availability attendees', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    const [session] = fixtures.sessions
      .filter((entry) => entry.startsAt > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const commands = new PrismaBookingCommands(prisma, () => now);
    for (const email of ['valeria@example.com', 'lucia@example.com']) {
      const client = fixtures.clients.find((entry) => entry.email === email)!;
      const account = await prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
        select: { id: true },
      });
      await commands.create(
        { sessionId: session.id },
        {
          accountId: account.id,
          authenticationSessionId: randomUUID(),
          identity: { kind: 'client' as const, clientId: client.id },
        },
      );
    }
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const bookedSession = () =>
    prisma.session.findFirstOrThrow({
      where: {
        state: 'SCHEDULED',
        startsAt: { gte: today, lt: new Date(today.getTime() + week) },
        bookings: { some: { state: 'BOOKED' } },
      },
      select: {
        id: true,
        branchId: true,
        bookings: {
          where: { state: 'BOOKED' },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { client: { select: { name: true } } },
        },
      },
    });

  it('tells who is coming by initials only, in booking order, when asked', async () => {
    const session = await bookedSession();

    const sessions = await listSessionAvailability(prisma)({
      branchId: session.branchId,
      from: today,
      until: new Date(today.getTime() + week),
      limit: 100,
      includeAttendees: true,
    });

    const item = sessions.find((entry) => entry.id === session.id)!;
    expect(item.attendeeInitials).toEqual(
      session.bookings.map((booking) => nameInitials(booking.client.name)),
    );
    for (const booking of session.bookings) {
      expect(JSON.stringify(item)).not.toContain(booking.client.name);
    }
  });

  it('leaves who is coming out unless asked', async () => {
    const session = await bookedSession();

    const sessions = await listSessionAvailability(prisma)({
      branchId: session.branchId,
      from: today,
      until: new Date(today.getTime() + week),
      limit: 100,
    });

    const item = sessions.find((entry) => entry.id === session.id)!;
    expect(item).not.toHaveProperty('attendeeInitials');
  });
});
