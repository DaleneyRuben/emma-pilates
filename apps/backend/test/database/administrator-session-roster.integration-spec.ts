import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { findAdministratorSessionRoster } from '../../src/booking/sessions/prisma-administrator-session-roster';
import {
  bookingClock as clock,
  createClientWithSubscription,
  createFixture,
} from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const asClient = (client: { accountId: string; clientId: string }) => ({
  accountId: client.accountId,
  authenticationSessionId: randomUUID(),
  identity: { kind: 'client' as const, clientId: client.clientId },
});

// WEB-039: Horario's class panel reads who booked a Session and who waits.
describe('the Administrator’s Session roster on PostgreSQL', () => {
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

  it('lists the booked Clients and the open Waitlist in queue order, without cancelled Bookings or closed entries', async () => {
    const fixture = await createFixture(prisma, { capacity: 2, now: clock });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const booked = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(fixture),
    );
    const cancelled = await createClientWithSubscription(prisma);
    await prisma.client.update({
      where: { id: cancelled.clientId },
      data: { name: 'Carla' },
    });
    const cancelledBooking = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(cancelled),
    );
    await prisma.booking.update({
      where: { id: cancelledBooking.id },
      data: {
        state: 'CANCELLED',
        cancelledAt: clock,
        cancellationCause: 'CLIENT_REQUEST',
      },
    });
    const second = await createClientWithSubscription(prisma);
    const secondBooking = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(second),
    );

    const names = ['Dora', 'Eva', 'Fabi'];
    const waiting = [];
    for (const name of names) {
      const client = await createClientWithSubscription(prisma);
      await prisma.client.update({
        where: { id: client.clientId },
        data: { name },
      });
      waiting.push({
        ...client,
        entry: await commands.joinWaitlist(
          { sessionId: fixture.sessionId },
          asClient(client),
        ),
      });
    }
    await prisma.waitlistEntry.update({
      where: { id: waiting[1].entry.id },
      data: { closedAt: clock, closureReason: 'LEFT' },
    });

    await expect(
      findAdministratorSessionRoster(prisma)(fixture.sessionId),
    ).resolves.toEqual({
      sessionId: fixture.sessionId,
      bookings: [
        {
          bookingId: booked.id,
          clientId: fixture.clientId,
          clientName: 'Ana',
          attendanceOutcome: null,
        },
        {
          bookingId: secondBooking.id,
          clientId: second.clientId,
          clientName: 'Bea',
          attendanceOutcome: null,
        },
      ],
      waitlist: [
        {
          waitlistEntryId: waiting[0].entry.id,
          clientId: waiting[0].clientId,
          clientName: 'Dora',
          position: 1,
        },
        {
          waitlistEntryId: waiting[2].entry.id,
          clientId: waiting[2].clientId,
          clientName: 'Fabi',
          position: 2,
        },
      ],
    });
  });

  it('answers null for a Session that does not exist', async () => {
    await expect(
      findAdministratorSessionRoster(prisma)(randomUUID()),
    ).resolves.toBeNull();
  });
});
