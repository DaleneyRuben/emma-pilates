import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('nutritionist evaluations migration', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  it('protects availability block, evaluation slot, and evaluation invariants', async () => {
    const client = await context.pool.connect();
    try {
      await client.query('BEGIN');
      const assertions = readFileSync(
        resolve(
          'test/database/fixtures/nutritionist-evaluations-constraints.sql',
        ),
        'utf8',
      );
      expect(assertions.match(/SELECT pg_temp.expect_failure/g)).toHaveLength(
        32,
      );
      await expect(client.query(assertions)).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
