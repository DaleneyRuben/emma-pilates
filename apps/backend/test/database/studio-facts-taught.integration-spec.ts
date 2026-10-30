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
} from './studio-facts-test-support';

const month = new Date('2026-10-01T00:00:00.000Z');

// FIX-008 (review 2026-10-28): KPIs, recommendations, and the narrative read
// these facts, so a cancelled or future Session must not become a class taught.
describe('studio facts count only the Sessions taught', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('skips cancelled and future Sessions and keeps the window-close snapshot', async () => {
    const world = await seedStudioWorld(context);
    const clientId = await insertClient(context);
    const subscriptionId = await insertSoldSubscription(context, world, {
      clientId,
      startsOn: '2026-10-01',
      endsOn: '2026-10-30',
      method: 'cash',
      paymentState: 'confirmed',
    });
    const taught = await insertSession(context, world, {
      startsAt: '2026-10-12T18:00:00.000Z',
      bookingsAtWindowClose: 3,
    });
    const cancelled = await insertSession(context, world, {
      startsAt: '2026-10-14T18:00:00.000Z',
      state: 'cancelled',
    });
    const future = await insertSession(context, world, {
      startsAt: '2026-10-28T18:00:00.000Z',
    });
    for (const sessionId of [taught, cancelled, future]) {
      await insertBooking(context, world, {
        sessionId,
        clientId,
        subscriptionId,
      });
    }

    await recomputeStudioFacts(prisma, {
      month,
      now: () => new Date('2026-10-23T15:00:00.000Z'),
    });

    const sessions = await context.pool.query<{
      session_id: string;
      bookings_at_window_close: number;
    }>(
      `SELECT session_id, bookings_at_window_close
       FROM studio.session_facts
       WHERE deleted_at IS NULL`,
    );
    const clients = await context.pool.query<{ classes_booked: number }>(
      `SELECT classes_booked
       FROM studio.client_month_facts
       WHERE deleted_at IS NULL AND client_id = $1`,
      [clientId],
    );
    expect(sessions.rows).toEqual([
      { session_id: taught, bookings_at_window_close: 3 },
    ]);
    // She booked the taught and the future class; the cancelled one is gone.
    expect(clients.rows).toEqual([{ classes_booked: 2 }]);
  });
});
