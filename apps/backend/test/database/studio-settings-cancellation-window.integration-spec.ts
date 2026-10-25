import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { readCurrentStudioSettings } from '../../src/booking/studio-settings/prisma-studio-settings';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { bookingClock, createFixture } from './booking-command-test-support';
import {
  startDatabaseTestContext,
  type DatabaseTestContext,
} from './database-test-context';

// BKM-004: the booking commands read the Cancellation Window from the Studio
// Settings version in force, inside their own transaction.
describe('the Cancellation Window from Studio Settings on PostgreSQL', () => {
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

  it('refuses a cancellation 3 hours ahead once the window is 4 hours', async () => {
    const startsAt = new Date(bookingClock.getTime() + 3 * 60 * 60 * 1_000);
    const first = await createFixture(prisma, { now: bookingClock, startsAt });
    const second = await createFixture(prisma, { now: bookingClock, startsAt });
    const commands = new PrismaBookingCommands(prisma, () => bookingClock);
    const principalOf = (fixture: typeof first) => ({
      accountId: fixture.accountId,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: fixture.clientId },
    });
    const firstBooking = await commands.create(
      { sessionId: first.sessionId },
      principalOf(first),
    );
    const secondBooking = await commands.create(
      { sessionId: second.sessionId },
      principalOf(second),
    );

    await expect(
      commands.cancel({ bookingId: firstBooking.id }, principalOf(first)),
    ).resolves.toBeUndefined();

    const current = await readCurrentStudioSettings(prisma);
    await prisma.studioSettingsVersion.create({
      data: {
        ...current,
        version: current.version + 1,
        cancellationWindowMinutes: 240,
        openingDate: null,
        createdByAccountId: first.accountId,
      },
    });

    await expect(
      commands.cancel({ bookingId: secondBooking.id }, principalOf(second)),
    ).rejects.toThrow('Booking is inside the Cancellation Window');
  });
});
