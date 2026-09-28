import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const now = new Date('2026-09-21T12:00:00.000Z');

describe('Client upcoming bookings', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });
  const lucia = fixtures.clients.find((c) => c.email === 'lucia@example.com')!;
  const luciaAccountId = () =>
    prisma.account
      .findFirstOrThrow({
        where: { email: lucia.email, deletedAt: null },
        select: { id: true },
      })
      .then((account) => account.id);
  const principal = async () => ({
    accountId: await luciaAccountId(),
    authenticationSessionId: randomUUID(),
    identity: { kind: 'client' as const, clientId: lucia.id },
  });
  const futureSessions = () =>
    fixtures.sessions
      .filter((session) => session.startsAt > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    await prisma.waitlistEntry.deleteMany({ where: { clientId: lucia.id } });
    await prisma.booking.deleteMany({ where: { clientId: lucia.id } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('lists upcoming Bookings and active Waitlist Entries with Session facts in start order', async () => {
    const [first, second] = futureSessions();
    const commands = new PrismaBookingCommands(prisma, () => now);
    const booking = await commands.create(
      { sessionId: second.id },
      await principal(),
    );
    const entry = await prisma.waitlistEntry.create({
      data: {
        sessionId: first.id,
        clientId: lucia.id,
        joinedByAccountId: await luciaAccountId(),
        joinedAt: now,
      },
    });

    const upcoming = await createCatalogRepository(
      prisma,
    ).findUpcomingClientBookings({ clientId: lucia.id, from: now });

    expect(upcoming.map((item) => item.kind)).toEqual(['waitlist', 'booking']);
    expect(upcoming[0]).toMatchObject({
      waitlistEntryId: entry.id,
      sessionId: first.id,
      startsAt: first.startsAt,
      trainerName: expect.any(String),
      branchName: expect.any(String),
      classTypeName: expect.any(String),
    });
    expect(upcoming[1]).toMatchObject({
      bookingId: booking.id,
      sessionId: second.id,
    });
  });

  it('closes an active Waitlist Entry as left and hides it afterwards', async () => {
    const [, , third] = futureSessions();
    const entry = await prisma.waitlistEntry.create({
      data: {
        sessionId: third.id,
        clientId: lucia.id,
        joinedByAccountId: await luciaAccountId(),
        joinedAt: now,
      },
    });
    const commands = new PrismaBookingCommands(prisma, () => now);

    await commands.leaveWaitlist(
      { waitlistEntryId: entry.id },
      await principal(),
    );

    await expect(
      prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({ closureReason: 'LEFT', closedAt: now });
    const upcoming = await createCatalogRepository(
      prisma,
    ).findUpcomingClientBookings({ clientId: lucia.id, from: now });
    expect(
      upcoming.some(
        (item) => item.kind === 'waitlist' && item.waitlistEntryId === entry.id,
      ),
    ).toBe(false);
  });
});
