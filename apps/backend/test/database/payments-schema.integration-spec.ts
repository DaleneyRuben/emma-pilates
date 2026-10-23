import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('payments migration', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  it('protects purchase intents, payments, credit, and referral invariants', async () => {
    const client = await context.pool.connect();
    try {
      await client.query('BEGIN');
      const assertions = readFileSync(
        resolve('test/database/fixtures/payments-constraints.sql'),
        'utf8',
      );
      expect(assertions.match(/SELECT pg_temp.expect_failure/g)).toHaveLength(
        15,
      );
      await expect(client.query(assertions)).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('keeps the payment link optional for subscriptions created before payments existed', async () => {
    const { rows } = await context.pool.query<{ is_nullable: string }>(
      `select is_nullable from information_schema.columns
        where table_schema = 'booking' and table_name = 'subscriptions' and column_name = 'payment_id'`,
    );

    expect(rows).toEqual([{ is_nullable: 'YES' }]);
  });
});
