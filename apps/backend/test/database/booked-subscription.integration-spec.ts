import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { withBookedSubscription } from '../../src/booking/commands/booked-subscription';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createFixture } from './booking-command-test-support';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// A Plan bought over a Guest Pass starts after its class (FIX-019), so the
// Subscription in force today is not always the one a Booking consumes. The
// app's «Reserva confirmada» toast reads it from the response instead.
describe('The Subscription a Booking consumed', () => {
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

  const principalOf = (fixture: { accountId: string; clientId: string }) => ({
    accountId: fixture.accountId,
    authenticationSessionId: randomUUID(),
    identity: { kind: 'client' as const, clientId: fixture.clientId },
  });

  it('names it on a new Booking and on its idempotent replay', async () => {
    const now = new Date('2026-09-15T14:00:00.000Z');
    const fixture = await createFixture(prisma, { now });
    const commands = new PrismaBookingCommands(prisma, () => now);
    const create = withBookedSubscription(
      prisma,
      commands.createIdempotent.bind(commands),
    );
    const key = randomUUID();

    const first = await create(
      { sessionId: fixture.sessionId },
      principalOf(fixture),
      key,
    );
    const replay = await create(
      { sessionId: fixture.sessionId },
      principalOf(fixture),
      key,
    );

    expect(first).toEqual({
      id: expect.any(String) as string,
      subscriptionId: fixture.subscriptionId,
    });
    expect(replay).toEqual(first);
  });

  it('names it on the replacement of a Reschedule', async () => {
    const now = new Date('2026-09-15T14:00:00.000Z');
    const fixture = await createFixture(prisma, {
      now,
      startsAt: new Date(now.getTime() + 90 * 60 * 1_000),
    });
    const commands = new PrismaBookingCommands(prisma, () => now);
    const source = await commands.create(
      { sessionId: fixture.sessionId },
      principalOf(fixture),
    );
    const sourceSession = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: { branchId: true, classTypeId: true, trainerStaffMemberId: true },
    });
    const target = await prisma.session.create({
      data: {
        ...sourceSession,
        startsAt: new Date(now.getTime() + 3 * 60 * 60 * 1_000),
        endsAt: new Date(now.getTime() + 4 * 60 * 60 * 1_000),
        capacity: 8,
      },
    });

    const replacement = await withBookedSubscription(
      prisma,
      commands.reschedule.bind(commands),
    )(
      { bookingId: source.id, targetSessionId: target.id },
      principalOf(fixture),
    );

    expect(replacement).toEqual({
      id: expect.any(String) as string,
      subscriptionId: fixture.subscriptionId,
    });
  });
});
