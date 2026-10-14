import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPgDump, spawnProcess } from '../../src/backup/pg-dump';
import {
  backupCountedTables,
  countBackupRows,
} from '../../src/backup/postgres-row-counts';
import {
  type DatabaseTestContext,
  startDatabaseTestContext,
} from '../database/database-test-context';

// EXT-009: the row counts the backup job logs, and (when
// BACKUP_TEST_PG_DUMP_PATH names a pg_dump of the server's major version) a
// real custom-format dump. CI's runner has no pg_dump 18, so the dump runs
// locally; the testing guide shows how.
const pgDumpPath = process.env.BACKUP_TEST_PG_DUMP_PATH;
const itWithPgDump = pgDumpPath === undefined ? it.skip : it;

describe('database backup against PostgreSQL', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    await context.pool.query(
      `insert into booking.branches (id, name, address, updated_at) values (gen_random_uuid(), 'Backup probe', 'Nowhere 1', now())`,
    );
  });

  afterAll(async () => {
    await context.stop();
  });

  it('counts the rows of every table the restore drill compares', async () => {
    const counts = await countBackupRows(context.databaseUrl);

    expect(Object.keys(counts)).toEqual([...backupCountedTables]);
    for (const table of backupCountedTables) {
      const direct = await context.pool.query<{ count: string }>(
        `select count(*) from ${table}`,
      );
      expect(counts[table]).toBe(Number(direct.rows[0].count));
    }
  });

  itWithPgDump('writes a custom-format dump of the database', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pilates-backup-'));
    try {
      const file = await createPgDump({
        pgDumpPath: pgDumpPath ?? 'pg_dump',
        databaseUrl: context.databaseUrl,
        directory,
        path: process.env.PATH ?? '',
        run: spawnProcess,
      })();

      const handle = await open(file);
      const magic = Buffer.alloc(5);
      await handle.read(magic, 0, 5, 0);
      await handle.close();
      expect(magic.toString('ascii')).toBe('PGDMP');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
