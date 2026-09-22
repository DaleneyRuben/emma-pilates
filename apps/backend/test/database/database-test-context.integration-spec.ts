import { Pool } from 'pg';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const databaseName = (databaseUrl: string): string =>
  new URL(databaseUrl).pathname.slice(1);

const databaseExists = async (
  adminPool: Pool,
  name: string,
): Promise<boolean> => {
  const result = await adminPool.query<{ exists: boolean }>(
    'select exists(select 1 from pg_database where datname = $1) as exists',
    [name],
  );
  return result.rows[0].exists;
};

describe('database test context', () => {
  const override = process.env.TEST_DATABASE_URL;
  const contexts: DatabaseTestContext[] = [];
  let adminPool: Pool | undefined;

  afterAll(async () => {
    await Promise.all(contexts.map((context) => context.stop()));
    await adminPool?.end();
  });

  it('gives every context its own migrated disposable database', async () => {
    const first = await startDatabaseTestContext();
    contexts.push(first);
    await first.pool.query(
      `insert into booking.branches (id, name, address) values (gen_random_uuid(), 'Isolation probe', 'Nowhere 1')`,
    );

    const second = await startDatabaseTestContext();
    contexts.push(second);
    const rows = await second.pool.query('select count(*)::int as count from booking.branches');

    expect(databaseName(second.databaseUrl)).not.toBe(
      databaseName(first.databaseUrl),
    );
    expect(rows.rows[0].count).toBe(0);
  });

  it('drops the disposable database on stop and never touches the override database', async () => {
    if (override === undefined) return;

    adminPool = new Pool({ connectionString: override });
    const context = await startDatabaseTestContext();
    const name = databaseName(context.databaseUrl);

    expect(name).not.toBe(databaseName(override));
    expect(name.startsWith('pilates_test_')).toBe(true);
    await expect(databaseExists(adminPool, name)).resolves.toBe(true);

    await context.stop();

    await expect(databaseExists(adminPool, name)).resolves.toBe(false);
    await expect(
      databaseExists(adminPool, databaseName(override)),
    ).resolves.toBe(true);
  });
});
