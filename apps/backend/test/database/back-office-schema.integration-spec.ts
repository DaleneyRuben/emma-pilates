import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('back office migration', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  it('protects supply stock, movement, salary payment, and expense invariants', async () => {
    const client = await context.pool.connect();
    try {
      await client.query('BEGIN');
      const assertions = readFileSync(
        resolve('test/database/fixtures/back-office-constraints.sql'),
        'utf8',
      );
      expect(assertions.match(/SELECT pg_temp.expect_failure/g)).toHaveLength(
        31,
      );
      await expect(client.query(assertions)).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  // BKO-008: one photo per payment, never removed while a payment names it.
  it('keeps an optional, unique, restricted receipt on a salary payment', async () => {
    const column = await context.pool.query<{
      is_nullable: string;
      data_type: string;
    }>(
      `SELECT is_nullable, data_type FROM information_schema.columns
        WHERE table_schema = 'back_office' AND table_name = 'salary_payments'
          AND column_name = 'receipt_image_asset_id'`,
    );
    expect(column.rows).toEqual([{ is_nullable: 'YES', data_type: 'uuid' }]);
    const constraints = await context.pool.query<{
      contype: string;
      confdeltype: string;
      target: string | null;
    }>(
      `SELECT c.contype, c.confdeltype, c.confrelid::regclass::text AS target
         FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'back_office.salary_payments'::regclass
          AND a.attname = 'receipt_image_asset_id'`,
    );
    expect(constraints.rows).toEqual([
      { contype: 'f', confdeltype: 'r', target: 'system.image_assets' },
    ]);
    const unique = await context.pool.query(
      `SELECT 1 FROM pg_indexes
        WHERE schemaname = 'back_office'
          AND indexname = 'salary_payments_receipt_image_asset_id_key'
          AND indexdef LIKE 'CREATE UNIQUE INDEX%'`,
    );
    expect(unique.rowCount).toBe(1);
  });
});
