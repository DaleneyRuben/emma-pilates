import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { readRevenueMonth } from '../../src/studio/prisma-revenue-report';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-10-23T15:00:00.000Z');

describe('accrued revenue report', () => {
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

  it('accrues a confirmed payment of Bs 300 across October and November and counts classes still owed', async () => {
    const branchId = randomUUID();
    const planId = randomUUID();
    const clientId = randomUUID();
    const staffId = randomUUID();
    const accountId = randomUUID();
    const paymentId = randomUUID();
    const subscriptionId = randomUUID();

    await context.pool.query('BEGIN');
    await context.pool.query(
      `INSERT INTO booking.branches (id, name, address, updated_at)
       VALUES ($1, $2, 'Test address', CURRENT_TIMESTAMP)`,
      [branchId, `Branch ${branchId}`],
    );
    await context.pool.query(
      `INSERT INTO booking.plans
         (id, name, duration_months, class_allowance, price_centavos, display_order, updated_at)
       VALUES ($1, 'Test Plan', 1, 8, 30000, 1, CURRENT_TIMESTAMP)`,
      [planId],
    );
    await context.pool.query(
      `INSERT INTO booking.clients (id, name, referral_code, updated_at)
       VALUES ($1, 'Test Client', $2, CURRENT_TIMESTAMP)`,
      [clientId, `ref-${clientId}`],
    );
    await context.pool.query(
      `INSERT INTO booking.staff_members (id, name, role, updated_at)
       VALUES ($1, 'Test Administrator', 'administrator', CURRENT_TIMESTAMP)`,
      [staffId],
    );
    await context.pool.query(
      `INSERT INTO system.accounts (id, email, staff_member_id, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [accountId, `${accountId}@example.com`, staffId],
    );
    await context.pool.query(
      `INSERT INTO booking.payments
         (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot,
          class_allowance_snapshot, plan_price_centavos, credit_applied_centavos,
          amount_due_centavos, method, state, collected_at_branch_id,
          submitted_by_account_id, submitted_at, decided_by_account_id, decided_at,
          updated_at)
       VALUES ($1, $2, $3, 'Test Plan', 1, 8, 30000, 0, 30000, 'cash', 'confirmed',
          $4, $5, '2026-10-20T04:00:00.000Z', $5, '2026-10-20T04:00:00.000Z',
          CURRENT_TIMESTAMP)`,
      [paymentId, clientId, planId, branchId, accountId],
    );
    await context.pool.query(
      `INSERT INTO booking.subscriptions
         (id, client_id, plan_id, payment_id, plan_name_snapshot,
          duration_months_snapshot, original_class_allowance,
          remaining_class_allowance, starts_on, ends_on, state, activated_at,
          updated_at)
       VALUES ($1, $2, $3, $4, 'Test Plan', 1, 8, 5, '2026-10-20', '2026-11-19',
          'active', '2026-10-20T04:00:00.000Z', CURRENT_TIMESTAMP)`,
      [subscriptionId, clientId, planId, paymentId],
    );
    await context.pool.query('COMMIT');

    const october = await readRevenueMonth(prisma, {
      month: new Date('2026-10-01T00:00:00.000Z'),
      today,
    });
    const november = await readRevenueMonth(prisma, {
      month: new Date('2026-11-01T00:00:00.000Z'),
      today,
    });

    expect(october.accruedCentavos).toBe(12_000);
    expect(november.accruedCentavos).toBe(18_000);
    expect(october.accruedCentavos + november.accruedCentavos).toBe(30_000);
    expect(october.cashCentavos).toBe(30_000);
    expect(november.cashCentavos).toBe(0);
    // Today is exclusive, like endsOn: 3 of 30 days have accrued, so Bs 270
    // of the Payment is still deferred.
    expect(october.deferredCentavos).toBe(27_000);
    expect(october.classesStillOwed).toBe(5);
    expect(november.classesStillOwed).toBe(5);
  });
});
