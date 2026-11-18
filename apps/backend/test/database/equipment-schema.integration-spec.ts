import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('equipment migration', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  it('seeds the three kinds as unit types, in their old order', async () => {
    const { rows } = await context.pool.query<{
      name: string;
      tracking: string;
      legacy_kind: string;
    }>(
      `SELECT name, tracking, legacy_kind FROM back_office.equipment_types
       ORDER BY legacy_kind`,
    );
    expect(rows).toEqual([
      { name: 'Reformer', tracking: 'unit', legacy_kind: 'reformer' },
      { name: 'Cadillac', tracking: 'unit', legacy_kind: 'cadillac' },
      { name: 'Mat', tracking: 'unit', legacy_kind: 'mat' },
    ]);
  });

  it('protects equipment numbers, types, stocks, and the issue history', async () => {
    const client = await context.pool.connect();
    try {
      await client.query('BEGIN');
      const assertions = readFileSync(
        resolve('test/database/fixtures/equipment-constraints.sql'),
        'utf8',
      );
      expect(assertions.match(/SELECT pg_temp.expect_failure/g)).toHaveLength(
        49,
      );
      await expect(client.query(assertions)).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
