import { randomUUID } from 'node:crypto';
import { DatabaseError, PoolClient } from 'pg';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('foundation migration', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  it('installs only approved business tables in their owning schemas', async () => {
    const result = await context.pool.query<{ table_name: string }>(`
      SELECT table_schema || '.' || table_name AS table_name
      FROM information_schema.tables
      WHERE table_schema IN ('back_office', 'booking', 'studio', 'system')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);

    expect(result.rows.map(({ table_name: tableName }) => tableName)).toEqual([
      'back_office.expense_categories',
      'back_office.expenses',
      'back_office.salary_payments',
      'back_office.supplies',
      'back_office.supply_restocks',
      'back_office.withdrawals',
      'booking.attendance_records',
      'booking.availability_blocks',
      'booking.bookings',
      'booking.branches',
      'booking.class_types',
      'booking.client_promotions_consents',
      'booking.clients',
      'booking.credit_ledger_entries',
      'booking.credit_reservations',
      'booking.evaluation_slots',
      'booking.evaluations',
      'booking.payments',
      'booking.plans',
      'booking.promotion_contacts',
      'booking.promotions',
      'booking.purchase_intents',
      'booking.referrals',
      'booking.session_schedules',
      'booking.sessions',
      'booking.staff_branch_assignments',
      'booking.staff_members',
      'booking.subscriptions',
      'booking.waitlist_entries',
      'studio.client_month_facts',
      'studio.session_facts',
      'system.account_devices',
      'system.account_email_changes',
      'system.accounts',
      'system.audit_records',
      'system.authentication_sessions',
      'system.authentication_throttle_events',
      'system.authentication_tokens',
      'system.email_suppressions',
      'system.idempotency_records',
      'system.image_assets',
      'system.image_variants',
      'system.impersonation_sessions',
      'system.notification_deliveries',
      'system.notifications',
    ]);
  });

  it('requires every account to belong to exactly one domain identity', async () => {
    await expectDatabaseError(
      context,
      async (client) => {
        await client.query(
          `
            INSERT INTO system.accounts (id, email, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
          `,
          [randomUUID(), 'identity@example.com'],
        );
      },
      '23514',
      'accounts_exactly_one_domain_identity_check',
    );
  });

  it('allows only one current authentication token per account and purpose', async () => {
    const clientId = randomUUID();
    const accountId = randomUUID();

    await expectDatabaseError(
      context,
      async (client) => {
        await client.query(
          `
            INSERT INTO booking.clients (id, name, referral_code, updated_at)
            VALUES ($1, 'Test Client', $2, CURRENT_TIMESTAMP)
          `,
          [clientId, `ref-${clientId}`],
        );
        await client.query(
          `
            INSERT INTO system.accounts (id, email, client_id, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          `,
          [accountId, `${accountId}@example.com`, clientId],
        );
        await client.query(
          `
            INSERT INTO system.authentication_tokens
              (id, account_id, purpose, token_digest, expires_at)
            VALUES
              ($1, $2, 'verification', $3, CURRENT_TIMESTAMP + INTERVAL '1 hour'),
              ($4, $2, 'verification', $5, CURRENT_TIMESTAMP + INTERVAL '1 hour')
          `,
          [
            randomUUID(),
            accountId,
            Buffer.from('first'),
            randomUUID(),
            Buffer.from('second'),
          ],
        );
      },
      '23505',
      'authentication_tokens_one_current_per_account_purpose_key',
    );
  });

  it('stores a hashed registration continuation in authentication tokens', async () => {
    const client = await context.pool.connect();
    const clientId = randomUUID();
    const accountId = randomUUID();

    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO booking.clients (id, name, referral_code, updated_at)
          VALUES ($1, 'Test Client', $2, CURRENT_TIMESTAMP)
        `,
        [clientId, `ref-${clientId}`],
      );
      await client.query(
        `
          INSERT INTO system.accounts (id, email, client_id, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `,
        [accountId, `${accountId}@example.com`, clientId],
      );

      const result = await client.query<{ purpose: string }>(
        `
          INSERT INTO system.authentication_tokens
            (id, account_id, purpose, token_digest, expires_at)
          VALUES
            ($1, $2, 'registration_continuation', $3, CURRENT_TIMESTAMP + INTERVAL '7 days')
          RETURNING purpose::text
        `,
        [randomUUID(), accountId, Buffer.from('continuation-digest')],
      );

      expect(result.rows).toEqual([{ purpose: 'registration_continuation' }]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('treats active branch names as unique after trimming and case folding', async () => {
    await expectDatabaseError(
      context,
      async (client) => {
        await client.query(
          `
            INSERT INTO booking.branches (id, name, address, updated_at)
            VALUES
              ($1, 'Central', 'First address', CURRENT_TIMESTAMP),
              ($2, ' central ', 'Second address', CURRENT_TIMESTAMP)
          `,
          [randomUUID(), randomUUID()],
        );
      },
      '23505',
      'branches_active_normalized_name_key',
    );
  });

  it('keeps audit records append-only', async () => {
    const auditRecordId = randomUUID();

    await expectDatabaseError(
      context,
      async (client) => {
        await client.query(
          `
            INSERT INTO system.audit_records
              (id, action_code, outcome, actor_kind, target_type, correlation_id)
            VALUES ($1, 'test.created', 'succeeded', 'system', 'test', $2)
          `,
          [auditRecordId, randomUUID()],
        );
        await client.query(
          'UPDATE system.audit_records SET action_code = $1 WHERE id = $2',
          ['test.changed', auditRecordId],
        );
      },
      '55000',
    );
  });
});

const expectDatabaseError = async (
  context: DatabaseTestContext,
  action: (client: PoolClient) => Promise<void>,
  code: string,
  constraint?: string,
): Promise<void> => {
  const client = await context.pool.connect();

  try {
    await client.query('BEGIN');

    try {
      await action(client);
      throw new Error('Expected the database operation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toMatchObject({
        code,
        ...(constraint ? { constraint } : {}),
      });
    }
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
};
