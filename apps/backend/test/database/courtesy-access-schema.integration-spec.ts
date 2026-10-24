import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('courtesy access migration (REL-011)', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  it('keeps Bs 0 to hidden Plans and to confirmed courtesy Payments', async () => {
    const client = await context.pool.connect();
    try {
      await client.query('BEGIN');
      const assertions = readFileSync(
        resolve('test/database/fixtures/courtesy-access-constraints.sql'),
        'utf8',
      );
      expect(assertions.match(/SELECT pg_temp.expect_failure/g)).toHaveLength(
        5,
      );
      await expect(client.query(assertions)).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
