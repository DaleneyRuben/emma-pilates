import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { readMonthKpis } from '../../src/studio/prisma-month-kpis';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('month kpi reader', () => {
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

  it('reads counts for the month from studio facts and treats an earlier active month as not new', async () => {
    const branchId = randomUUID();
    const classTypeId = randomUUID();
    const trainerId = randomUUID();
    const held = randomUUID();
    const other = randomUUID();
    const ana = randomUUID();
    const bea = randomUUID();
    const luz = randomUUID();

    await context.pool.query(
      `INSERT INTO studio.session_facts
         (session_id, session_date, branch_id, class_type_id, trainer_staff_member_id,
          capacity, bookings_at_window_close, attended, no_shows, updated_at)
       VALUES
         ($1, '2026-10-06', $3, $4, $5, 12, 8, 7, 1, CURRENT_TIMESTAMP),
         ($2, '2026-10-13', $3, $4, $5, 10, 5, 4, 1, CURRENT_TIMESTAMP),
         ($6, '2026-09-08', $3, $4, $5, 8, 8, 8, 0, CURRENT_TIMESTAMP)`,
      [held, other, branchId, classTypeId, trainerId, randomUUID()],
    );
    await context.pool.query(
      `INSERT INTO studio.client_month_facts
         (client_id, month, plan_days, classes_booked, classes_attended, renewed, updated_at)
       VALUES
         ($1, '2026-10-01', 30, 4, 3, true, CURRENT_TIMESTAMP),
         ($2, '2026-10-01', 12, 2, 1, false, CURRENT_TIMESTAMP),
         ($3, '2026-10-01', 0, 0, 0, false, CURRENT_TIMESTAMP),
         ($2, '2026-09-01', 30, 4, 4, false, CURRENT_TIMESTAMP)`,
      [ana, bea, luz],
    );

    const october = await readMonthKpis(prisma, {
      month: new Date('2026-10-01T00:00:00.000Z'),
    });

    // Same worked example as the unit spec: occupancy round(100 * 13 / 22)
    // = 59, students 6.5, attendance 5.5, no-show round(100 * 2 / 13) = 15.
    // Bea already had plan days in September, so only Ana is new.
    expect(october).toEqual({
      sessionsHeld: 2,
      occupancyPercent: 59,
      averageStudentsTimes10: 65,
      averageAttendanceTimes10: 55,
      noShowPercent: 15,
      activeClients: 2,
      newClients: 1,
      // «Renovó» is booking's one definition over real sales (owner
      // decision 5); these fact rows carry no sale, so nothing ended.
      renewedClients: 0,
      renewalPercent: 0,
    });
  });
});
