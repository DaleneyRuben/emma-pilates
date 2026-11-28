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
      trainerName: expect.any(String) as string,
      branchName: expect.any(String) as string,
      classTypeName: expect.any(String) as string,
    });
    expect(upcoming[1]).toMatchObject({
      bookingId: booking.id,
      sessionId: second.id,
    });
  });

  it('names the Subscription each upcoming Booking consumed, so a cancel toast speaks of the right Plan', async () => {
    const later = futureSessions()[8];
    const commands = new PrismaBookingCommands(prisma, () => now);
    const booking = await commands.create(
      { sessionId: later.id },
      await principal(),
    );
    const { subscriptionId } = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      select: { subscriptionId: true },
    });

    const upcoming = await createCatalogRepository(
      prisma,
    ).findUpcomingClientBookings({ clientId: lucia.id, from: now });

    expect(
      upcoming.find(
        (item) => item.kind === 'booking' && item.bookingId === booking.id,
      ),
    ).toMatchObject({ subscriptionId });
    expect(
      upcoming
        .filter((item) => item.kind === 'waitlist')
        .every((item) => !('subscriptionId' in item)),
    ).toBe(true);
  });

  it('tells who else is coming and the places, by initials only', async () => {
    const sessionId = futureSessions()[3].id;
    const valeria = fixtures.clients.find(
      (c) => c.email === 'valeria@example.com',
    )!;
    const valeriaAccount = await prisma.account.findFirstOrThrow({
      where: { email: valeria.email, deletedAt: null },
      select: { id: true },
    });
    const commands = new PrismaBookingCommands(prisma, () => now);
    await commands.create(
      { sessionId },
      {
        accountId: valeriaAccount.id,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client' as const, clientId: valeria.id },
      },
    );
    await commands.create({ sessionId }, await principal());
    const booked = await prisma.booking.findMany({
      where: { sessionId, state: 'BOOKED' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { clientId: true, client: { select: { name: true } } },
    });
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      select: { capacity: true },
    });

    const upcoming = await createCatalogRepository(
      prisma,
    ).findUpcomingClientBookings({ clientId: lucia.id, from: now });

    const item = upcoming.find((entry) => entry.sessionId === sessionId)!;
    const othersInitials = booked
      .filter((row) => row.clientId !== lucia.id)
      .map((row) =>
        row.client.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join(''),
      );
    expect(othersInitials.length).toBeGreaterThan(0);
    expect(item).toMatchObject({
      capacity: session.capacity,
      bookedCount: booked.length,
      attendeeInitials: othersInitials,
    });
    for (const row of booked) {
      expect(JSON.stringify(item)).not.toContain(row.client.name);
    }
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
