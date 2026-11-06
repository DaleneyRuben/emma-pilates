import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { findTrainerSessionRoster } from '../../src/booking/prisma-trainer-session-roster';
import {
  bookingClock as clock,
  createClientWithSubscription,
  createFixture,
} from './booking-command-test-support';
import { attachClientPhoto } from './client-photo-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const asClient = (client: { accountId: string; clientId: string }) => ({
  accountId: client.accountId,
  authenticationSessionId: randomUUID(),
  identity: { kind: 'client' as const, clientId: client.clientId },
});

// The Trainer's class roster and attendance (FIX-041: with each photo).
describe('the Trainer’s Session roster on PostgreSQL', () => {
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

  it('lists the booked Clients in booking order with their photos', async () => {
    const fixture = await createFixture(prisma, { capacity: 2, now: clock });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const first = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(fixture),
    );
    const second = await createClientWithSubscription(prisma);
    const secondBooking = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(second),
    );
    const photo = await attachClientPhoto(prisma, second.clientId);

    await expect(
      findTrainerSessionRoster(prisma)(fixture.sessionId),
    ).resolves.toMatchObject({
      sessionId: fixture.sessionId,
      trainerStaffMemberId: fixture.trainerId,
      bookings: [
        {
          bookingId: first.id,
          clientName: 'Ana',
          clientPhoto: null,
          attendanceOutcome: null,
        },
        {
          bookingId: secondBooking.id,
          clientName: 'Bea',
          clientPhoto: { imageAssetId: photo },
          attendanceOutcome: null,
        },
      ],
    });
  });

  it('answers null for a Session that does not exist', async () => {
    await expect(
      findTrainerSessionRoster(prisma)(randomUUID()),
    ).resolves.toBeNull();
  });
});
