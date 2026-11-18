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

  it('gives a unit the old API inserts by kind its seeded type', async () => {
    const client = await context.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO booking.branches (id, name, address, updated_at) VALUES
         ('00000000-0000-0000-0000-000000000001', 'Centro', 'Test address', now());
        INSERT INTO booking.staff_members (id, name, role, updated_at) VALUES
         ('00000000-0000-0000-0000-000000000001', 'Paola', 'administrator', now());
        INSERT INTO system.accounts (id, email, staff_member_id, updated_at) VALUES
         ('00000000-0000-0000-0000-000000000001', 'paola@example.com',
          '00000000-0000-0000-0000-000000000001', now());
      `);
      const { rows } = await client.query<{ kind: string; type: string }>(
        `INSERT INTO back_office.equipment
           (id, branch_id, kind, number, created_by_account_id, updated_at)
         VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001',
           'cadillac', 1, '00000000-0000-0000-0000-000000000001', now())
         RETURNING kind,
           (SELECT legacy_kind::text FROM back_office.equipment_types
            WHERE id = type_id) AS type`,
      );
      expect(rows).toEqual([{ kind: 'cadillac', type: 'cadillac' }]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
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
