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
import { attachClientPhoto } from './client-photo-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const hour = 60 * 60 * 1_000;

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

  it('lists the booked Clients and the open Waitlist in queue order with their photos, without cancelled Bookings or closed entries', async () => {
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
        cancelledAt: new Date(),
        cancelledByAccountId: cancelled.accountId,
        cancellationCause: 'CLIENT_REQUEST',
      },
    });
    const second = await createClientWithSubscription(prisma);
    const secondBooking = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(second),
    );
    const secondPhoto = await attachClientPhoto(prisma, second.clientId);

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
    const doraPhoto = await attachClientPhoto(prisma, waiting[0].clientId);
    await prisma.waitlistEntry.update({
      where: { id: waiting[1].entry.id },
      data: {
        closedAt: new Date(),
        closureReason: 'LEFT',
        closedByAccountId: waiting[1].accountId,
      },
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
          clientPhoto: null,
          attendanceOutcome: null,
          classNumber: 1,
          founder: false,
        },
        {
          bookingId: secondBooking.id,
          clientId: second.clientId,
          clientName: 'Bea',
          clientPhoto: { imageAssetId: secondPhoto },
          attendanceOutcome: null,
          classNumber: 1,
          founder: false,
        },
      ],
      waitlist: [
        {
          waitlistEntryId: waiting[0].entry.id,
          clientId: waiting[0].clientId,
          clientName: 'Dora',
          clientPhoto: { imageAssetId: doraPhoto },
          position: 1,
        },
        {
          waitlistEntryId: waiting[2].entry.id,
          clientId: waiting[2].clientId,
          clientName: 'Fabi',
          clientPhoto: null,
          position: 2,
        },
      ],
    });
  });

  // W1 (Editar clase A): «12.ª clase», «Primera clase» and «Fundadora» under
  // each name, counted as the Trainer's roster counts them (E6 B).
  it('counts each Client’s class and marks an active founder', async () => {
    const fixture = await createFixture(prisma, { capacity: 8, now: clock });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
    });
    const before = await prisma.session.create({
      data: {
        branchId: session.branchId,
        classTypeId: session.classTypeId,
        trainerStaffMemberId: session.trainerStaffMemberId,
        startsAt: new Date(session.startsAt.getTime() - 2 * hour),
        endsAt: new Date(session.endsAt.getTime() - 2 * hour),
        capacity: 8,
      },
    });
    await commands.create({ sessionId: before.id }, asClient(fixture));
    const second = await createClientWithSubscription(prisma);
    await prisma.founderMembership.create({
      data: { clientId: second.clientId, number: 7, since: clock },
    });
    const ana = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(fixture),
    );
    const bea = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(second),
    );

    const lost = await createClientWithSubscription(prisma);
    await prisma.founderMembership.create({
      data: {
        clientId: lost.clientId,
        number: 8,
        since: clock,
        status: 'LOST',
        lostAt: clock,
      },
    });
    const cata = await commands.create(
      { sessionId: fixture.sessionId },
      asClient(lost),
    );
    const afterBoth = () => session.startsAt;

    await expect(
      findAdministratorSessionRoster(prisma, afterBoth)(fixture.sessionId),
    ).resolves.toMatchObject({
      bookings: [
        { bookingId: ana.id, classNumber: 2, founder: false },
        { bookingId: bea.id, classNumber: 1, founder: true },
        { bookingId: cata.id, classNumber: 1, founder: false },
      ],
    });
    // Opened before the earlier class is held, it does not count yet.
    await expect(
      findAdministratorSessionRoster(prisma, () => clock)(fixture.sessionId),
    ).resolves.toMatchObject({
      bookings: [{ bookingId: ana.id, classNumber: 1 }, {}, {}],
    });
  });

  it('answers null for a Session that does not exist', async () => {
    await expect(
      findAdministratorSessionRoster(prisma)(randomUUID()),
    ).resolves.toBeNull();
  });
});
