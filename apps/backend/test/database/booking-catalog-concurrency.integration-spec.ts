import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('booking catalog concurrent writes', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const branches = [randomUUID(), randomUUID()];
  const trainers = [randomUUID(), randomUUID()];
  const classTypeId = randomUUID();
  const clientId = randomUUID();
  const planId = randomUUID();
  const scheduleId = randomUUID();

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await prisma.branch.createMany({
      data: branches.map((id) => ({ id, name: id, address: 'Test' })),
    });
    await prisma.staffMember.createMany({
      data: trainers.map((id) => ({ id, name: 'Trainer', role: 'TRAINER' })),
    });
    await prisma.classType.create({
      data: {
        id: classTypeId,
        name: classTypeId,
        description: 'Test',
        durationMinutes: 60,
        defaultCapacity: 8,
      },
    });
    await prisma.client.create({
      data: { id: clientId, name: 'Test', referralCode: clientId },
    });
    await prisma.plan.create({
      data: {
        id: planId,
        name: planId,
        durationMonths: 1,
        classAllowance: 8,
        priceCentavos: 30000,
        displayOrder: 0,
      },
    });
    await prisma.sessionSchedule.create({
      data: {
        id: scheduleId,
        branchId: branches[0],
        trainerStaffMemberId: trainers[0],
        classTypeId,
        weekday: 1,
        startsAtLocal: new Date('1970-01-01T09:00:00Z'),
        capacity: 8,
        effectiveFrom: new Date('2026-09-01'),
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany({ where: { classTypeId } });
    await prisma.subscription.deleteMany({ where: { planId } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.sessionSchedule.deleteMany({ where: { id: scheduleId } });
      await prisma.plan.deleteMany({ where: { id: planId } });
      await prisma.client.deleteMany({ where: { id: clientId } });
      await prisma.classType.deleteMany({ where: { id: classTypeId } });
      await prisma.staffMember.deleteMany({ where: { id: { in: trainers } } });
      await prisma.branch.deleteMany({ where: { id: { in: branches } } });
      await prisma.$disconnect();
    }
    await context?.stop();
  });

  const sessionInsert = `INSERT INTO booking.sessions
    (id, branch_id, trainer_staff_member_id, class_type_id, starts_at, ends_at, capacity, updated_at)
    VALUES ($1, $2, $3, $4, '2026-09-14T13:00:00Z', '2026-09-14T14:00:00Z', 8, now())`;

  it('rejects a second Branch allocation even with a different Trainer', async () => {
    await expectBlockedConflict(
      context,
      sessionInsert,
      [randomUUID(), branches[0], trainers[0], classTypeId],
      [randomUUID(), branches[0], trainers[1], classTypeId],
      '23P01',
      'sessions_branch_no_overlap',
    );
    expect(await prisma.session.count({ where: { classTypeId } })).toBe(1);
  });

  it('rejects a second Trainer allocation even at a different Branch', async () => {
    await expectBlockedConflict(
      context,
      sessionInsert,
      [randomUUID(), branches[0], trainers[0], classTypeId],
      [randomUUID(), branches[1], trainers[0], classTypeId],
      '23P01',
      'sessions_trainer_no_overlap',
    );
    expect(await prisma.session.count({ where: { classTypeId } })).toBe(1);
  });

  it('allows only one active Subscription to commit for a Client', async () => {
    const insert = `INSERT INTO booking.subscriptions
      (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot,
       original_class_allowance, remaining_class_allowance, starts_on, ends_on, activated_at, updated_at)
      VALUES ($1, $2, $3, 'Test', 1, 8, 8, '2026-09-01', '2026-10-01', now(), now())`;
    await expectBlockedConflict(
      context,
      insert,
      [randomUUID(), clientId, planId],
      [randomUUID(), clientId, planId],
      '23505',
      'subscriptions_one_active_per_client_key',
    );
    expect(await prisma.subscription.count({ where: { clientId } })).toBe(1);
  });

  it('prevents duplicate source occurrences even after cancellation', async () => {
    const insert = `INSERT INTO booking.sessions
      (id, session_schedule_id, branch_id, trainer_staff_member_id, class_type_id,
       starts_at, ends_at, capacity, state, cancellation_cause, cancelled_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, '2026-09-14T13:00:00Z', '2026-09-14T14:00:00Z',
       8, 'cancelled', 'zero_bookings', now(), now())`;
    const references = [scheduleId, branches[0], trainers[0], classTypeId];
    await expectBlockedConflict(
      context,
      insert,
      [randomUUID(), ...references],
      [randomUUID(), ...references],
      '23505',
      'sessions_session_schedule_id_occurrence_starts_at_key',
    );
    expect(
      await prisma.session.count({ where: { sessionScheduleId: scheduleId } }),
    ).toBe(1);
  });
});

async function expectBlockedConflict(
  context: DatabaseTestContext,
  statement: string,
  firstValues: string[],
  secondValues: string[],
  code: string,
  constraint: string,
): Promise<void> {
  const first = await context.pool.connect();
  const second = await context.pool.connect();
  let pending: Promise<unknown> | undefined;
  try {
    await first.query('BEGIN');
    await second.query('BEGIN');
    await second.query("SET LOCAL statement_timeout = '5s'");
    const firstPid = (
      await first.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    ).rows[0].pid;
    const secondPid = (
      await second.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    ).rows[0].pid;
    await first.query(statement, firstValues);
    pending = second.query(statement, secondValues).then(
      () => null,
      (error: unknown) => error,
    );

    // Prove the transactions overlap; Promise.all alone can execute sequentially.
    let blocked = false;
    const deadline = Date.now() + 3000;
    while (!blocked && Date.now() < deadline) {
      const result = await context.pool.query<{ blocked: boolean }>(
        'SELECT $1::integer = ANY(pg_blocking_pids($2::integer)) AS blocked',
        [firstPid, secondPid],
      );
      blocked = result.rows[0].blocked;
      if (!blocked) await setTimeout(10);
    }
    expect(blocked).toBe(true);
    await first.query('COMMIT');
    expect(await pending).toMatchObject({ code, constraint });
  } finally {
    await first.query('ROLLBACK');
    await pending;
    await second.query('ROLLBACK');
    first.release();
    second.release();
  }
}
