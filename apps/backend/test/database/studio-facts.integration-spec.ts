import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { recomputeStudioFacts } from '../../src/studio/prisma-studio-facts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const month = new Date('2026-10-01T00:00:00.000Z');

describe('studio facts', () => {
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

  const insertSession = async (
    client: {
      query: (sql: string, values?: unknown[]) => Promise<unknown>;
    },
    input: {
      id: string;
      startsAt: string;
      capacity: number;
      branchId: string;
      classTypeId: string;
      trainerId: string;
    },
  ) => {
    await client.query(
      `INSERT INTO booking.sessions
         (id, branch_id, class_type_id, trainer_staff_member_id, starts_at, ends_at, capacity, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5::timestamptz + interval '50 minutes', $6, CURRENT_TIMESTAMP)`,
      [
        input.id,
        input.branchId,
        input.classTypeId,
        input.trainerId,
        input.startsAt,
        input.capacity,
      ],
    );
  };

  it('writes the month’s session and client facts, and a second run changes nothing', async () => {
    const branchId = randomUUID();
    const classTypeId = randomUUID();
    const trainerId = randomUUID();
    const planId = randomUUID();
    const accountId = randomUUID();
    const sessionId = randomUUID();
    const emptySessionId = randomUUID();
    const clients = [randomUUID(), randomUUID(), randomUUID()];
    const subscriptionIds = [randomUUID(), randomUUID(), randomUUID()];

    await context.pool.query('BEGIN');
    await context.pool.query(
      `INSERT INTO booking.branches (id, name, address, updated_at)
       VALUES ($1, $2, 'Test address', CURRENT_TIMESTAMP)`,
      [branchId, `Branch ${branchId}`],
    );
    await context.pool.query(
      `INSERT INTO booking.class_types
         (id, name, description, default_capacity, updated_at)
       VALUES ($1, $2, 'Test class', 8, CURRENT_TIMESTAMP)`,
      [classTypeId, `Class ${classTypeId}`],
    );
    await context.pool.query(
      `INSERT INTO booking.staff_members (id, name, role, updated_at)
       VALUES ($1, 'Test Trainer', 'trainer', CURRENT_TIMESTAMP)`,
      [trainerId],
    );
    await context.pool.query(
      `INSERT INTO booking.plans
         (id, name, duration_months, class_allowance, price_centavos, display_order, updated_at)
       VALUES ($1, 'Test Plan', 1, 8, 35000, 1, CURRENT_TIMESTAMP)`,
      [planId],
    );
    await context.pool.query(
      `INSERT INTO system.accounts (id, email, staff_member_id, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [accountId, `${accountId}@example.com`, trainerId],
    );
    for (const [index, clientId] of clients.entries()) {
      await context.pool.query(
        `INSERT INTO booking.clients (id, name, referral_code, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [clientId, `Client ${index}`, `ref-${clientId}`],
      );
      await context.pool.query(
        `INSERT INTO booking.subscriptions
           (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot,
            original_class_allowance, remaining_class_allowance, starts_on, ends_on, activated_at, updated_at)
         VALUES ($1, $2, $3, 'Test Plan', 1, 8, 6, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          subscriptionIds[index],
          clientId,
          planId,
          index === 2 ? '2026-09-01' : '2026-10-20',
          index === 2 ? '2026-09-30' : '2026-11-18',
          '2026-10-01T04:00:00.000Z',
        ],
      );
    }
    await insertSession(context.pool, {
      id: sessionId,
      startsAt: '2026-10-12T18:00:00.000Z',
      capacity: 8,
      branchId,
      classTypeId,
      trainerId,
    });
    await insertSession(context.pool, {
      id: emptySessionId,
      startsAt: '2026-10-13T18:00:00.000Z',
      capacity: 6,
      branchId,
      classTypeId,
      trainerId,
    });
    const bookingStates = ['booked', 'booked', 'cancelled'] as const;
    const outcomes = ['attended', 'no_show', null] as const;
    for (const [index, clientId] of clients.entries()) {
      const bookingId = randomUUID();
      const cancelled = bookingStates[index] === 'cancelled';
      await context.pool.query(
        `INSERT INTO booking.bookings
           (id, session_id, client_id, subscription_id, state, created_by_account_id,
            cancelled_at, cancelled_by_account_id, cancellation_cause, updated_at)
         VALUES ($1, $2, $3, $4, $5::"booking"."BookingState", $6,
            ${cancelled ? 'CURRENT_TIMESTAMP' : 'NULL'},
            ${cancelled ? '$6' : 'NULL'},
            ${cancelled ? "'client_request'" : 'NULL'},
            CURRENT_TIMESTAMP)`,
        [
          bookingId,
          sessionId,
          clientId,
          subscriptionIds[index],
          bookingStates[index],
          accountId,
        ],
      );
      if (outcomes[index] !== null) {
        await context.pool.query(
          `INSERT INTO booking.attendance_records
             (booking_id, outcome, recorded_by_account_id, recorded_at, updated_at)
           VALUES ($1, $2::"booking"."AttendanceOutcome", $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [bookingId, outcomes[index], accountId],
        );
      }
    }
    await context.pool.query('COMMIT');

    await recomputeStudioFacts(prisma, {
      month,
      now: () => new Date('2026-10-23T15:00:00.000Z'),
    });
    const firstSessions = await context.pool.query(
      `SELECT session_id, session_date, branch_id, class_type_id, trainer_staff_member_id,
              capacity, bookings_at_window_close, attended, no_shows
       FROM studio.session_facts
       WHERE deleted_at IS NULL
       ORDER BY session_date`,
    );
    const firstClients = await context.pool.query(
      `SELECT client_id, month, plan_days, classes_booked, classes_attended, renewed
       FROM studio.client_month_facts
       WHERE deleted_at IS NULL
       ORDER BY client_id`,
    );

    expect(firstSessions.rows).toEqual([
      {
        session_id: sessionId,
        session_date: monthFrom('2026-10-12'),
        branch_id: branchId,
        class_type_id: classTypeId,
        trainer_staff_member_id: trainerId,
        capacity: 8,
        bookings_at_window_close: 2,
        attended: 1,
        no_shows: 1,
      },
      {
        session_id: emptySessionId,
        session_date: monthFrom('2026-10-13'),
        branch_id: branchId,
        class_type_id: classTypeId,
        trainer_staff_member_id: trainerId,
        capacity: 6,
        bookings_at_window_close: 0,
        attended: 0,
        no_shows: 0,
      },
    ]);
    expect(firstClients.rows).toEqual(
      [...clients].sort().map((clientId) => {
        const original = clients.indexOf(clientId);
        return {
          client_id: clientId,
          month,
          plan_days: original === 2 ? 0 : 12,
          classes_booked: original === 2 ? 0 : 1,
          classes_attended: original === 0 ? 1 : 0,
          renewed: original !== 2,
        };
      }),
    );

    const before = await context.pool.query(
      `SELECT 'session' AS kind, session_id::text AS id, updated_at
       FROM studio.session_facts WHERE deleted_at IS NULL
       UNION ALL
       SELECT 'client', client_id::text, updated_at
       FROM studio.client_month_facts WHERE deleted_at IS NULL
       ORDER BY kind, id`,
    );
    await recomputeStudioFacts(prisma, {
      month,
      now: () => new Date('2026-10-23T16:00:00.000Z'),
    });
    const after = await context.pool.query(
      `SELECT 'session' AS kind, session_id::text AS id, updated_at
       FROM studio.session_facts WHERE deleted_at IS NULL
       UNION ALL
       SELECT 'client', client_id::text, updated_at
       FROM studio.client_month_facts WHERE deleted_at IS NULL
       ORDER BY kind, id`,
    );
    expect(after.rows).toEqual(before.rows);
  });
});

const monthFrom = (day: string): Date => new Date(`${day}T00:00:00.000Z`);
