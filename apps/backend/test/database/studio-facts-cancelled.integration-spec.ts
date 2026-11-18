import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { recomputeStudioFacts } from '../../src/studio/prisma-studio-facts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import {
  insertBooking,
  insertClient,
  insertSession,
  insertSoldSubscription,
  seedStudioWorld,
  type StudioWorld,
} from './studio-facts-test-support';

// Walkthrough finding 107: the recompute keeps classes cancelled for low
// demand in studio.cancelled_session_facts, and only those.
describe('cancelled session facts', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let world: StudioWorld;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await prisma.$connect();
    world = await seedStudioWorld(context);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const live = async () =>
    (
      await context.pool.query<{
        session_id: string;
        cause: string;
        bookings_held: number;
      }>(
        `SELECT session_id, cause, bookings_held
         FROM studio.cancelled_session_facts
         WHERE deleted_at IS NULL
         ORDER BY cause`,
      )
    ).rows;

  it('writes low-demand cancellations, skips the others, and retires a reopened one', async () => {
    const minimum = await insertSession(context, world, {
      startsAt: '2026-11-03T20:00:00.000Z',
      state: 'cancelled',
      cause: 'minimum_not_met',
      bookingsAtWindowClose: 1,
    });
    const empty = await insertSession(context, world, {
      startsAt: '2026-11-04T20:00:00.000Z',
      state: 'cancelled',
      cause: 'zero_bookings',
    });
    await insertSession(context, world, {
      startsAt: '2026-11-05T20:00:00.000Z',
      state: 'cancelled',
      cause: 'schedule_changed',
    });
    const month = new Date('2026-11-01T00:00:00.000Z');
    const now = () => new Date('2026-11-18T15:00:00.000Z');

    await recomputeStudioFacts(prisma, { month, now });
    await recomputeStudioFacts(prisma, { month, now });
    expect(await live()).toEqual([
      { session_id: minimum, cause: 'minimum_not_met', bookings_held: 1 },
      { session_id: empty, cause: 'zero_bookings', bookings_held: 0 },
    ]);

    await context.pool.query(
      `UPDATE booking.sessions
       SET state = 'scheduled', cancellation_cause = NULL, cancelled_at = NULL
       WHERE id = $1`,
      [empty],
    );
    await recomputeStudioFacts(prisma, { month, now });
    expect(await live()).toEqual([
      { session_id: minimum, cause: 'minimum_not_met', bookings_held: 1 },
    ]);
  });

  // Walkthrough finding 108: her Booking released by a minimum cancellation
  // still counts in her month, so she is not an inactive Client.
  it('counts a booking the studio released in the client month', async () => {
    const clientId = await insertClient(context);
    const subscriptionId = await insertSoldSubscription(context, world, {
      clientId,
      startsOn: '2026-12-01',
      endsOn: '2026-12-30',
      method: 'cash',
      paymentState: 'confirmed',
    });
    const sessionId = await insertSession(context, world, {
      startsAt: '2026-12-03T20:00:00.000Z',
    });
    await insertBooking(context, world, {
      sessionId,
      clientId,
      subscriptionId,
    });
    await context.pool.query(
      `UPDATE booking.sessions
       SET state = 'cancelled', cancellation_cause = 'minimum_not_met',
           cancelled_at = starts_at - interval '3 hours'
       WHERE id = $1`,
      [sessionId],
    );
    await context.pool.query(
      `UPDATE booking.bookings
       SET state = 'cancelled', cancellation_cause = 'session_cancelled',
           cancelled_at = CURRENT_TIMESTAMP
       WHERE session_id = $1`,
      [sessionId],
    );

    await recomputeStudioFacts(prisma, {
      month: new Date('2026-12-01T00:00:00.000Z'),
      now: () => new Date('2026-12-10T15:00:00.000Z'),
    });
    const facts = await context.pool.query<{ classes_booked: number }>(
      `SELECT classes_booked FROM studio.client_month_facts
       WHERE deleted_at IS NULL AND client_id = $1 AND month = '2026-12-01'`,
      [clientId],
    );
    expect(facts.rows).toEqual([{ classes_booked: 1 }]);
  });
});
