import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import {
  recalculateStudioMonth,
  recomputeCurrentStudioMonth,
} from '../../src/studio/studio.module';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import {
  insertSession,
  seedStudioWorld,
  type StudioWorld,
} from './studio-facts-test-support';

// FIX-008 (review 2026-10-28): the worker's daily run must finalize the
// previous month, which it recomputes through day 8 of the next one.
describe('the daily studio facts run', () => {
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

  const octoberFacts = async () =>
    (
      await context.pool.query<{ bookings_at_window_close: number }>(
        `SELECT bookings_at_window_close
         FROM studio.session_facts
         WHERE deleted_at IS NULL AND session_date = '2026-10-31'`,
      )
    ).rows;

  it('finalizes the last class of October on Nov 8 and leaves October alone after', async () => {
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

  // Walkthrough finding 107: the month's recommendations used to wait for a
  // recompute by hand, so Informes said «Nada que revisar este mes.».
  it('recomputes the month recommendations after the facts', async () => {
    for (const day of ['04', '11', '18']) {
      await insertSession(context, world, {
        startsAt: `2026-11-${day}T14:00:00.000Z`,
        bookingsAtWindowClose: 1,
      });
    }

    await recomputeCurrentStudioMonth(
      prisma,
      new Date('2026-11-20T03:00:00.000Z'),
    );
    const rows = await context.pool.query<{ rule: string }>(
      `SELECT rule FROM studio.recommendations
       WHERE deleted_at IS NULL AND period = '2026-11-01'
         AND rule = 'weak_schedule'`,
    );
    expect(rows.rows).toEqual([{ rule: 'weak_schedule' }]);
  });

  // Review of finding 107: Recalcular on a final month must not rebuild its
  // facts from today's Bookings (FIX-008); it recomputes the findings only.
  it('recalculates a final month without touching its facts', async () => {
    const sessionId = await insertSession(context, world, {
      startsAt: '2026-09-30T22:00:00.000Z',
      bookingsAtWindowClose: 2,
    });
    await recalculateStudioMonth(prisma, {
      month: new Date('2026-09-01T00:00:00.000Z'),
      now: new Date('2026-10-05T03:00:00.000Z'),
    });
    await context.pool.query(
      `UPDATE booking.sessions SET bookings_at_window_close = 6 WHERE id = $1`,
      [sessionId],
    );

    await recalculateStudioMonth(prisma, {
      month: new Date('2026-09-01T00:00:00.000Z'),
      now: new Date('2026-11-20T03:00:00.000Z'),
    });
    const facts = await context.pool.query<{ bookings: number }>(
      `SELECT bookings_at_window_close AS bookings FROM studio.session_facts
       WHERE deleted_at IS NULL AND session_id = $1`,
      [sessionId],
    );
    expect(facts.rows).toEqual([{ bookings: 2 }]);
  });
});
