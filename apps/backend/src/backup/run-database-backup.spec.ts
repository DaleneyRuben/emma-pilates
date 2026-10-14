import {
  runDatabaseBackup,
  type DatabaseBackupDependencies,
} from './run-database-backup';

const startedAt = new Date('2026-10-14T07:00:12.345Z');
const rowCounts = {
  'system.accounts': 3,
  'booking.clients': 1,
  'booking.payments': 0,
  'booking.bookings': 0,
  'system.audit_records': 12,
};

const setUp = (overrides: Partial<DatabaseBackupDependencies> = {}) => {
  const calls: string[] = [];
  const records: Record<string, unknown>[] = [];
  let now = startedAt.getTime();
  const dependencies: DatabaseBackupDependencies = {
    database: 'emma',
    countRows: jest.fn(() => {
      calls.push('count');
      return Promise.resolve(rowCounts);
    }),
    dump: jest.fn(() => {
      calls.push('dump');
      now += 4_000;
      return Promise.resolve('/tmp/backup/emma.dump');
    }),
    describeFile: jest.fn(() =>
      Promise.resolve({ size: 300_000, sha256: 'ab12' }),
    ),
    removeFile: jest.fn((path: string) => {
      calls.push(`remove ${path}`);
      return Promise.resolve();
    }),
    store: {
      latestDailySize: jest.fn(() => Promise.resolve(290_000)),
      upload: jest.fn((key: string) => {
        calls.push(`upload ${key}`);
        return Promise.resolve();
      }),
      copy: jest.fn((from: string, to: string) => {
        calls.push(`copy ${from} ${to}`);
        return Promise.resolve();
      }),
    },
    ping: {
      success: jest.fn(() => {
        calls.push('ping success');
        return Promise.resolve();
      }),
      failure: jest.fn(() => {
        calls.push('ping failure');
        return Promise.resolve();
      }),
    },
    now: () => new Date(now),
    log: (record) => records.push(record),
    ...overrides,
  };
  return { dependencies, calls, records };
};

describe('runDatabaseBackup (EXT-009)', () => {
  it('counts, dumps, uploads, copies the month, cleans up, then pings', async () => {
    const { dependencies, calls, records } = setUp();

    await expect(runDatabaseBackup(dependencies)).resolves.toEqual({
      outcome: 'succeeded',
    });

    expect(calls).toEqual([
      'count',
      'dump',
      'upload daily/emma-20261014T070012Z.dump',
      'copy daily/emma-20261014T070012Z.dump monthly/emma-2026-10.dump',
      'remove /tmp/backup/emma.dump',
      'ping success',
    ]);
    expect(dependencies.store.upload).toHaveBeenCalledWith(
      'daily/emma-20261014T070012Z.dump',
      '/tmp/backup/emma.dump',
      { size: 300_000, sha256: 'ab12', rowCounts },
    );
    expect(records).toEqual([
      {
        event: 'database_backup_succeeded',
        key: 'daily/emma-20261014T070012Z.dump',
        monthlyKey: 'monthly/emma-2026-10.dump',
        sizeBytes: 300_000,
        previousSizeBytes: 290_000,
        sha256: 'ab12',
        rowCounts,
        durationMs: 4_000,
      },
    ]);
  });

  // The runbook calls a dump that suddenly shrinks a failure; it is still
  // kept, since it may be the only copy of today's data.
  it('keeps a dump under half the previous size but reports a failure', async () => {
    const { dependencies, calls, records } = setUp();
    dependencies.store.latestDailySize = jest.fn(() =>
      Promise.resolve(700_000),
    );

    await expect(runDatabaseBackup(dependencies)).resolves.toEqual({
      outcome: 'shrank',
    });

    expect(calls).toContain('upload daily/emma-20261014T070012Z.dump');
    expect(calls.at(-1)).toBe('ping failure');
    expect(records.at(-1)).toEqual({
      event: 'database_backup_shrank',
      key: 'daily/emma-20261014T070012Z.dump',
      sizeBytes: 300_000,
      previousSizeBytes: 700_000,
    });
  });

  it('succeeds without a previous dump to compare with', async () => {
    const { dependencies } = setUp();
    dependencies.store.latestDailySize = jest.fn(() => Promise.resolve(null));

    await expect(runDatabaseBackup(dependencies)).resolves.toEqual({
      outcome: 'succeeded',
    });
    expect(dependencies.ping.success).toHaveBeenCalled();
  });

  it('stops at a failed dump, reports the stage, and pings the failure', async () => {
    const { dependencies, calls, records } = setUp({
      dump: jest.fn(() =>
        Promise.reject(new Error('pg_dump exited with code 1: timeout')),
      ),
    });

    await expect(runDatabaseBackup(dependencies)).resolves.toEqual({
      outcome: 'failed',
      stage: 'dump',
    });

    expect(calls).toEqual(['count', 'ping failure']);
    expect(records).toEqual([
      {
        event: 'database_backup_failed',
        stage: 'dump',
        error: 'pg_dump exited with code 1: timeout',
      },
    ]);
  });

  it('removes the local dump even when the upload fails', async () => {
    const { dependencies, calls } = setUp();
    dependencies.store.upload = jest.fn(() =>
      Promise.reject(new Error('PreconditionFailed')),
    );

    await expect(runDatabaseBackup(dependencies)).resolves.toEqual({
      outcome: 'failed',
      stage: 'upload',
    });
    expect(calls).toEqual([
      'count',
      'dump',
      'remove /tmp/backup/emma.dump',
      'ping failure',
    ]);
  });

  it('reports a failed monthly copy as a failure after the daily upload', async () => {
    const { dependencies, records } = setUp();
    dependencies.store.copy = jest.fn(() =>
      Promise.reject(new Error('AccessDenied')),
    );

    await expect(runDatabaseBackup(dependencies)).resolves.toEqual({
      outcome: 'failed',
      stage: 'copy',
    });
    expect(records).toEqual([
      { event: 'database_backup_failed', stage: 'copy', error: 'AccessDenied' },
    ]);
  });
});
