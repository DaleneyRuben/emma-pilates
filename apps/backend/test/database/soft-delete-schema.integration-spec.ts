import { randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// ADR-0086 / BE-011: rows are marked removed, never deleted, and uniqueness
// that a removed row must not block counts only live rows.
describe('soft delete schema', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  it('gives every soft-deleted table a deleted_at column', async () => {
    const result = await context.pool.query<{ table_name: string }>(`
      SELECT table_schema || '.' || table_name AS table_name
      FROM information_schema.columns
      WHERE table_schema IN ('back_office', 'booking', 'studio', 'system')
        AND column_name = 'deleted_at'
      ORDER BY 1
    `);

    expect(result.rows.map(({ table_name: name }) => name)).toEqual([
      'back_office.expense_categories',
      'booking.client_promotions_consents',
      'booking.clients',
      'booking.promotion_contacts',
      'booking.staff_branch_assignments',
      'booking.staff_members',
      'studio.client_month_facts',
      'studio.recommendations',
      'studio.session_facts',
      'system.account_email_changes',
      'system.accounts',
      'system.authentication_sessions',
      'system.authentication_throttle_events',
      'system.idempotency_records',
      'system.image_assets',
      'system.image_variants',
      'system.impersonation_sessions',
      'system.notifications',
    ]);
  });

  it('never cascades or nulls on delete between application tables', async () => {
    const result = await context.pool.query<{ name: string }>(`
      SELECT conrelid::regclass::text || '.' || conname AS name
      FROM pg_constraint
      WHERE contype = 'f'
        AND connamespace::regnamespace::text IN ('back_office', 'booking', 'studio', 'system')
        AND confdeltype IN ('c', 'n', 'd')
      ORDER BY 1
    `);

    expect(result.rows).toEqual([]);
  });

  it('lets a removed Account free its email for a new one', async () => {
    await inTransaction(context, async (client) => {
      const email = `${randomUUID()}@example.com`;
      await insertClientAccount(client, email, 'CURRENT_TIMESTAMP');
      await insertClientAccount(client, email, 'NULL');

      await expect(
        insertClientAccount(client, email, 'NULL'),
      ).rejects.toMatchObject({
        code: '23505',
        constraint: 'accounts_email_key',
      });
    });
  });

  it('keeps one live email change per Account while keeping removed ones', async () => {
    await inTransaction(context, async (client) => {
      const accountId = await insertClientAccount(
        client,
        `${randomUUID()}@example.com`,
        'NULL',
      );
      await insertEmailChange(client, accountId, 'CURRENT_TIMESTAMP');
      await insertEmailChange(client, accountId, 'NULL');

      await expect(
        insertEmailChange(client, accountId, 'NULL'),
      ).rejects.toMatchObject({
        code: '23505',
        constraint: 'account_email_changes_account_id_key',
      });
    });
  });

  it('lets a removed Branch assignment be assigned again', async () => {
    await inTransaction(context, async (client) => {
      const staffMemberId = randomUUID();
      const branchId = randomUUID();
      await client.query(
        `INSERT INTO booking.staff_members (id, name, role, updated_at)
         VALUES ($1, 'Test Trainer', 'trainer', CURRENT_TIMESTAMP)`,
        [staffMemberId],
      );
      await client.query(
        `INSERT INTO booking.branches (id, name, address, updated_at)
         VALUES ($1, $2, 'Test address', CURRENT_TIMESTAMP)`,
        [branchId, `Branch ${branchId}`],
      );
      const assign = (deletedAt: string) =>
        client.query(
          `INSERT INTO booking.staff_branch_assignments
             (id, staff_member_id, branch_id, deleted_at)
           VALUES ($1, $2, $3, ${deletedAt})`,
          [randomUUID(), staffMemberId, branchId],
        );
      await assign('CURRENT_TIMESTAMP');
      await assign('NULL');

      await expect(assign('NULL')).rejects.toMatchObject({
        code: '23505',
        constraint: 'staff_branch_assignments_staff_member_id_branch_id_key',
      });
    });
  });

  it('lets an idempotency key be reused only after its record was swept', async () => {
    await inTransaction(context, async (client) => {
      const accountId = await insertClientAccount(
        client,
        `${randomUUID()}@example.com`,
        'NULL',
      );
      const key = randomUUID();
      const record = (deletedAt: string) =>
        client.query(
          `INSERT INTO system.idempotency_records
             (id, account_id, command, idempotency_key, request_hash,
              response_status, expires_at, deleted_at)
           VALUES ($1, $2, 'test.command', $3, $4, 201,
                   CURRENT_TIMESTAMP + INTERVAL '1 day', ${deletedAt})`,
          [randomUUID(), accountId, key, Buffer.from('hash')],
        );
      await record('CURRENT_TIMESTAMP');
      await record('NULL');

      await expect(record('NULL')).rejects.toMatchObject({
        code: '23505',
        constraint:
          'idempotency_records_account_id_command_idempotency_key_key',
      });
    });
  });

  it('still dedupes a business event against a swept notification', async () => {
    await inTransaction(context, async (client) => {
      const accountId = await insertClientAccount(
        client,
        `${randomUUID()}@example.com`,
        'NULL',
      );
      const notify = (deletedAt: string) =>
        client.query(
          `INSERT INTO system.notifications
             (id, account_id, category, type, business_event_key, title,
              message, deleted_at)
           VALUES ($1, $2, 'reminder', 'test', 'event-1', 'Title',
                   'Message', ${deletedAt})`,
          [randomUUID(), accountId],
        );
      await notify('CURRENT_TIMESTAMP');

      await expect(notify('NULL')).rejects.toMatchObject({
        code: '23505',
        constraint: 'notifications_account_id_business_event_key_key',
      });
    });
  });
});

const insertClientAccount = async (
  client: PoolClient,
  email: string,
  deletedAt: string,
): Promise<string> => {
  const clientId = randomUUID();
  const accountId = randomUUID();
  await client.query(
    `INSERT INTO booking.clients (id, name, referral_code, updated_at, deleted_at)
     VALUES ($1, 'Test Client', $2, CURRENT_TIMESTAMP, ${deletedAt})`,
    [clientId, `ref-${clientId}`],
  );
  await client.query(
    `INSERT INTO system.accounts (id, email, client_id, updated_at, deleted_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, ${deletedAt})`,
    [accountId, email, clientId],
  );
  return accountId;
};

const insertEmailChange = async (
  client: PoolClient,
  accountId: string,
  deletedAt: string,
): Promise<void> => {
  const tokenId = randomUUID();
  // Tokens are inserted invalidated so the one-current-token-per-purpose
  // index never fires first; only the change row's uniqueness is under test.
  await client.query(
    `INSERT INTO system.authentication_tokens
       (id, account_id, purpose, token_digest, expires_at, invalidated_at)
     VALUES ($1, $2, 'email_change', $3, CURRENT_TIMESTAMP + INTERVAL '1 day',
             CURRENT_TIMESTAMP)`,
    [tokenId, accountId, Buffer.from(tokenId)],
  );
  await client.query(
    `INSERT INTO system.account_email_changes
       (id, account_id, new_email, authentication_token_id, requested_at,
        expires_at, deleted_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP,
             CURRENT_TIMESTAMP + INTERVAL '1 day', ${deletedAt})`,
    [randomUUID(), accountId, `${randomUUID()}@example.com`, tokenId],
  );
};

// Each case runs in a rolled-back transaction; the expected violation is
// always its last statement.
const inTransaction = async (
  context: DatabaseTestContext,
  action: (client: PoolClient) => Promise<void>,
): Promise<void> => {
  const client = await context.pool.connect();
  try {
    await client.query('BEGIN');
    await action(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
};
