import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { recomputeCurrentStudioMonth } from '../../src/studio/studio.module';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import { insertSession, seedStudioWorld } from './studio-facts-test-support';

// FIX-008 (review 2026-10-28): the worker's daily run must finalize the
// previous month, which it recomputes through day 8 of the next one.
describe('the daily studio facts run', () => {
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

  const octoberFacts = async () =>
    (
      await context.pool.query<{ bookings_at_window_close: number }>(
        `SELECT bookings_at_window_close
         FROM studio.session_facts
         WHERE deleted_at IS NULL AND session_date = '2026-10-31'`,
      )
    ).rows;

  it('finalizes the last class of October on Nov 8 and leaves October alone after', async () => {
    const world = await seedStudioWorld(context);
    const sessionId = await insertSession(context, world, {
      startsAt: '2026-10-31T22:00:00.000Z',
      bookingsAtWindowClose: 4,
    });

    // 23:00 on Nov 8 in La Paz.
    await recomputeCurrentStudioMonth(
      prisma,
      new Date('2026-11-09T03:00:00.000Z'),
    );
    expect(await octoberFacts()).toEqual([{ bookings_at_window_close: 4 }]);

    await context.pool.query(
      `UPDATE booking.sessions SET bookings_at_window_close = 5 WHERE id = $1`,
      [sessionId],
    );
    // 00:30 on Nov 9 in La Paz: October is final.
    await recomputeCurrentStudioMonth(
      prisma,
      new Date('2026-11-09T04:30:00.000Z'),
    );
    expect(await octoberFacts()).toEqual([{ bookings_at_window_close: 4 }]);
  });
});
