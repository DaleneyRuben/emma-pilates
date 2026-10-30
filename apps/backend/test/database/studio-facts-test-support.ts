import { randomUUID } from 'node:crypto';
import type { DatabaseTestContext } from './database-test-context';

// FIX-008: the rows a studio fact recompute reads, inserted by SQL so each
// spec states only what differs (a cancelled Session, a courtesy plan…).
export type StudioWorld = {
  branchId: string;
  classTypeId: string;
  trainerId: string;
  accountId: string;
  planId: string;
};

export const seedStudioWorld = async (
  context: DatabaseTestContext,
): Promise<StudioWorld> => {
  const world: StudioWorld = {
    branchId: randomUUID(),
    classTypeId: randomUUID(),
    trainerId: randomUUID(),
    accountId: randomUUID(),
    planId: randomUUID(),
  };
  await context.pool.query(
    `INSERT INTO booking.branches (id, name, address, updated_at)
     VALUES ($1, $2, 'Test address', CURRENT_TIMESTAMP)`,
    [world.branchId, `Branch ${world.branchId}`],
  );
  await context.pool.query(
    `INSERT INTO booking.class_types
       (id, name, description, default_capacity, updated_at)
     VALUES ($1, $2, 'Test class', 8, CURRENT_TIMESTAMP)`,
    [world.classTypeId, `Class ${world.classTypeId}`],
  );
  await context.pool.query(
    `INSERT INTO booking.staff_members (id, name, role, updated_at)
     VALUES ($1, 'Test Trainer', 'trainer', CURRENT_TIMESTAMP)`,
    [world.trainerId],
  );
  await context.pool.query(
    `INSERT INTO system.accounts (id, email, staff_member_id, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
    [world.accountId, `${world.accountId}@example.com`, world.trainerId],
  );
  await context.pool.query(
    `INSERT INTO booking.plans
       (id, name, duration_days, class_allowance, price_centavos, display_order, updated_at)
     VALUES ($1, 'Test Plan', 30, 8, 35000, 1, CURRENT_TIMESTAMP)`,
    [world.planId],
  );
  return world;
};

export const insertClient = async (
  context: DatabaseTestContext,
): Promise<string> => {
  const clientId = randomUUID();
  await context.pool.query(
    `INSERT INTO booking.clients (id, name, referral_code, updated_at)
     VALUES ($1, 'Test Client', $2, CURRENT_TIMESTAMP)`,
    [clientId, `ref-${clientId}`],
  );
  return clientId;
};

// A Subscription sold by a Payment in the given method and state, so a
// courtesy plan, a guest pass, and a voided sale look as they do in Booking.
export const insertSoldSubscription = async (
  context: DatabaseTestContext,
  world: StudioWorld,
  input: {
    clientId: string;
    startsOn: string;
    endsOn: string;
    method: 'cash' | 'courtesy';
    paymentState: 'confirmed' | 'voided';
  },
): Promise<string> => {
  const paymentId = randomUUID();
  const subscriptionId = randomUUID();
  const price = input.method === 'courtesy' ? 0 : 35_000;
  // A confirmed Payment needs its Subscription by commit (deferred trigger).
  const client = await context.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO booking.payments
       (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot,
        class_allowance_snapshot, plan_price_centavos, credit_applied_centavos,
        amount_due_centavos, starts_on, method, state, collected_at_branch_id,
        submitted_by_account_id,
        submitted_at, decided_by_account_id, decided_at, voided_at,
        voided_by_account_id, void_reason, updated_at)
     VALUES ($1, $2, $3, 'Test Plan', 30, 8, $4, 0, $4, $5,
        $6::booking."PaymentMethod", $7::booking."PaymentState",
        CASE WHEN $6 = 'cash' THEN $9::uuid END, $8,
        '2026-10-01T14:00:00.000Z', $8, '2026-10-01T14:00:00.000Z',
        CASE WHEN $7 = 'voided' THEN '2026-10-02T14:00:00.000Z'::timestamptz END,
        CASE WHEN $7 = 'voided' THEN $8::uuid END,
        CASE WHEN $7 = 'voided' THEN 'Error de registro' END,
        CURRENT_TIMESTAMP)`,
      [
        paymentId,
        input.clientId,
        world.planId,
        price,
        input.startsOn,
        input.method,
        input.paymentState,
        world.accountId,
        world.branchId,
      ],
    );
    await client.query(
      `INSERT INTO booking.subscriptions
       (id, client_id, plan_id, payment_id, plan_name_snapshot,
        duration_days_snapshot, original_class_allowance,
        remaining_class_allowance, starts_on, ends_on, state, activated_at,
        updated_at)
     VALUES ($1, $2, $3, $4, 'Test Plan', 30, 8, 8, $5, $6, 'active',
        '2026-10-01T14:00:00.000Z', CURRENT_TIMESTAMP)`,
      [
        subscriptionId,
        input.clientId,
        world.planId,
        paymentId,
        input.startsOn,
        input.endsOn,
      ],
    );
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  return subscriptionId;
};

export const insertSession = async (
  context: DatabaseTestContext,
  world: StudioWorld,
  input: {
    startsAt: string;
    state?: 'scheduled' | 'cancelled';
    bookingsAtWindowClose?: number;
  },
): Promise<string> => {
  const sessionId = randomUUID();
  const cancelled = input.state === 'cancelled';
  await context.pool.query(
    `INSERT INTO booking.sessions
       (id, branch_id, class_type_id, trainer_staff_member_id, starts_at,
        ends_at, capacity, state, cancellation_cause, cancelled_at,
        cancelled_by_account_id, bookings_at_window_close, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5::timestamptz + interval '50 minutes', 8,
        $6::booking."SessionState",
        CASE WHEN $7 THEN 'schedule_changed'::booking."SessionCancellationCause" END,
        CASE WHEN $7 THEN $5::timestamptz - interval '1 day' END,
        CASE WHEN $7 THEN $8::uuid END,
        $9, CURRENT_TIMESTAMP)`,
    [
      sessionId,
      world.branchId,
      world.classTypeId,
      world.trainerId,
      input.startsAt,
      input.state ?? 'scheduled',
      cancelled,
      world.accountId,
      input.bookingsAtWindowClose ?? null,
    ],
  );
  return sessionId;
};

export const insertBooking = async (
  context: DatabaseTestContext,
  world: StudioWorld,
  input: { sessionId: string; clientId: string; subscriptionId: string },
): Promise<void> => {
  await context.pool.query(
    `INSERT INTO booking.bookings
       (id, session_id, client_id, subscription_id, state,
        created_by_account_id, updated_at)
     VALUES ($1, $2, $3, $4, 'booked', $5, CURRENT_TIMESTAMP)`,
    [
      randomUUID(),
      input.sessionId,
      input.clientId,
      input.subscriptionId,
      world.accountId,
    ],
  );
};
