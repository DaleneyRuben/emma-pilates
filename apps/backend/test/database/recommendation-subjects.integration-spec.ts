import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import {
  readRecommendations,
  recomputeRecommendations,
} from '../../src/studio/prisma-recommendations';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// Walkthrough finding 107: a finding names who it is about, and a recompute
// retires the findings that no longer hold.
describe('recommendation subjects', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const month = new Date('2026-10-01T00:00:00.000Z');
  const today = new Date('2026-10-23T00:00:00.000Z');

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

  const seed = async () => {
    const trainerId = randomUUID();
    const clientId = randomUUID();
    await context.pool.query(
      `INSERT INTO booking.staff_members (id, name, role, updated_at)
       VALUES ($1, 'Daniela Rojas', 'trainer', CURRENT_TIMESTAMP)`,
      [trainerId],
    );
    await context.pool.query(
      `INSERT INTO booking.clients (id, name, referral_code, updated_at)
       VALUES ($1, 'Luz Pérez', $2, CURRENT_TIMESTAMP)`,
      [clientId, `LUZ${clientId.slice(0, 6)}`],
    );
    for (const day of ['2026-10-06', '2026-10-13', '2026-10-20']) {
      await context.pool.query(
        `INSERT INTO studio.session_facts
           (session_id, session_date, branch_id, class_type_id, trainer_staff_member_id,
            capacity, bookings_at_window_close, attended, no_shows, updated_at)
         VALUES ($1, $2::date, $3, $4, $5, 8, 1, 1, 0, CURRENT_TIMESTAMP)`,
        [randomUUID(), day, randomUUID(), randomUUID(), trainerId],
      );
    }
    await context.pool.query(
      `INSERT INTO studio.client_month_facts
         (client_id, month, plan_days, classes_booked, classes_attended, renewed, updated_at)
       VALUES ($1, '2026-10-01', 30, 0, 0, false, CURRENT_TIMESTAMP)`,
      [clientId],
    );
    return { trainerId, clientId };
  };

  it('names the client and the trainer and weekday of each finding', async () => {
    const { trainerId, clientId } = await seed();

    await recomputeRecommendations(prisma, { month, today });
    const listed = await readRecommendations(prisma, { month });

    expect(listed.find((row) => row.subject === clientId)).toMatchObject({
      rule: 'inactive_client',
      clientId,
      clientName: 'Luz Pérez',
    });
    expect(
      listed.find((row) => row.subject === `${trainerId}:2`),
    ).toMatchObject({
      rule: 'weak_schedule',
      trainerName: 'Daniela Rojas',
      weekday: 2,
    });
  });

  it('resolves a finding that no longer holds and reopens it when it returns', async () => {
    const { clientId } = await seed();
    await recomputeRecommendations(prisma, { month, today });

    await context.pool.query(
      `UPDATE studio.client_month_facts SET classes_booked = 1
       WHERE client_id = $1`,
      [clientId],
    );
    await recomputeRecommendations(prisma, { month, today });
    const resolved = await readRecommendations(prisma, { month });
    expect(resolved.find((row) => row.subject === clientId)?.state).toBe(
      'resolved',
    );

    await context.pool.query(
      `UPDATE studio.client_month_facts SET classes_booked = 0
       WHERE client_id = $1`,
      [clientId],
    );
    await recomputeRecommendations(prisma, { month, today });
    const reopened = await readRecommendations(prisma, { month });
    expect(reopened.find((row) => row.subject === clientId)?.state).toBe('new');
  });

  it('resolves every open finding when a month has none left', async () => {
    const month = new Date('2026-08-01T00:00:00.000Z');
    const clientId = randomUUID();
    await context.pool.query(
      `INSERT INTO studio.recommendations
         (id, rule, subject, period, detail, state, updated_at)
       VALUES ($1, 'inactive_client', $2, '2026-08-01', 'x: y', 'seen', CURRENT_TIMESTAMP)`,
      [randomUUID(), clientId],
    );

    const result = await recomputeRecommendations(prisma, { month, today });

    expect(result.written).toBe(0);
    const listed = await readRecommendations(prisma, { month });
    expect(listed.map((row) => row.state)).toEqual(['resolved']);
  });

  it('counts classes cancelled for the minimum toward a weak schedule', async () => {
    const trainerId = randomUUID();
    const month = new Date('2026-09-01T00:00:00.000Z');
    await context.pool.query(
      `INSERT INTO studio.session_facts
         (session_id, session_date, branch_id, class_type_id, trainer_staff_member_id,
          capacity, bookings_at_window_close, attended, no_shows, updated_at)
       VALUES ($1, '2026-09-08', $2, $2, $3, 8, 1, 1, 0, CURRENT_TIMESTAMP)`,
      [randomUUID(), randomUUID(), trainerId],
    );
    for (const day of ['2026-09-01', '2026-09-15']) {
      await context.pool.query(
        `INSERT INTO studio.cancelled_session_facts
           (session_id, session_date, branch_id, class_type_id,
            trainer_staff_member_id, cause, bookings_held, updated_at)
         VALUES ($1, $2::date, $3, $3, $4, 'minimum_not_met', 0, CURRENT_TIMESTAMP)`,
        [randomUUID(), day, randomUUID(), trainerId],
      );
    }

    await recomputeRecommendations(prisma, { month, today });
    const listed = await readRecommendations(prisma, { month });

    expect(listed.find((row) => row.subject === `${trainerId}:2`)?.detail).toBe(
      'Revisa el horario del martes: de 3 clases, 2 se cancelaron por mínimo; promedia 0,3 clientas.',
    );
  });
});
