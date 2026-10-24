import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import {
  dismissRecommendation,
  readRecommendations,
  recomputeRecommendations,
} from '../../src/studio/prisma-recommendations';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('recommendations', () => {
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

  const insertFacts = async (
    trainerId: string,
    clientId: string,
  ): Promise<void> => {
    const branchId = randomUUID();
    const classTypeId = randomUUID();
    await context.pool.query(
      `INSERT INTO studio.session_facts
         (session_id, session_date, branch_id, class_type_id, trainer_staff_member_id,
          capacity, bookings_at_window_close, attended, no_shows, updated_at)
       VALUES
         ($1, '2026-10-06', $4, $5, $6, 8, 2, 2, 0, CURRENT_TIMESTAMP),
         ($2, '2026-10-13', $4, $5, $6, 8, 1, 1, 0, CURRENT_TIMESTAMP),
         ($3, '2026-10-20', $4, $5, $6, 8, 2, 1, 1, CURRENT_TIMESTAMP)`,
      [
        randomUUID(),
        randomUUID(),
        randomUUID(),
        branchId,
        classTypeId,
        trainerId,
      ],
    );
    await context.pool.query(
      `INSERT INTO studio.client_month_facts
         (client_id, month, plan_days, classes_booked, classes_attended, renewed, updated_at)
       VALUES ($1, '2026-10-01', 30, 0, 0, false, CURRENT_TIMESTAMP)`,
      [clientId],
    );
  };

  it('upserts findings for the month and a second run does not duplicate them', async () => {
    const trainerId = randomUUID();
    const clientId = randomUUID();
    await insertFacts(trainerId, clientId);
    const month = new Date('2026-10-01T00:00:00.000Z');
    const today = new Date('2026-10-23T00:00:00.000Z');

    const first = await recomputeRecommendations(prisma, { month, today });
    const second = await recomputeRecommendations(prisma, { month, today });
    const rows = await context.pool.query<{
      rule: string;
      subject: string;
      state: string;
    }>(
      `SELECT rule, subject, state
       FROM studio.recommendations
       WHERE deleted_at IS NULL AND period = '2026-10-01'
       ORDER BY rule`,
    );

    expect(first.written).toBe(2);
    expect(second.written).toBe(2);
    expect(rows.rows).toEqual([
      {
        rule: 'inactive_client',
        subject: clientId,
        state: 'new',
      },
      {
        rule: 'weak_schedule',
        subject: `${trainerId}:2`,
        state: 'new',
      },
    ]);
    const count = await context.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM studio.recommendations
       WHERE deleted_at IS NULL`,
    );
    expect(count.rows[0]?.count).toBe('2');
  });

  it('keeps a dismissed finding dismissed across a recompute', async () => {
    const trainerId = randomUUID();
    const clientId = randomUUID();
    await insertFacts(trainerId, clientId);
    const month = new Date('2026-10-01T00:00:00.000Z');
    const today = new Date('2026-10-23T00:00:00.000Z');
    await recomputeRecommendations(prisma, { month, today });
    const listed = await readRecommendations(prisma, { month });
    const weak = listed.find(
      (row) => row.rule === 'weak_schedule' && row.subject === `${trainerId}:2`,
    );
    expect(weak).toBeDefined();

    await dismissRecommendation(prisma, { id: weak!.id });
    await recomputeRecommendations(prisma, { month, today });
    const again = (await readRecommendations(prisma, { month })).filter(
      (row) => row.subject === clientId || row.subject === `${trainerId}:2`,
    );

    expect(again.find((row) => row.id === weak!.id)?.state).toBe('dismissed');
    expect(again).toHaveLength(2);
  });
});
