import { dailyBackupKey, monthlyBackupKey } from './backup-keys';

export type RowCounts = Record<string, number>;

export type BackupStore = {
  latestDailySize: () => Promise<number | null>;
  upload: (
    key: string,
    path: string,
    details: { size: number; sha256: string; rowCounts: RowCounts },
  ) => Promise<void>;
  copy: (from: string, to: string) => Promise<void>;
};

export type DatabaseBackupDependencies = {
  database: string;
  countRows: () => Promise<RowCounts>;
  dump: () => Promise<string>;
  describeFile: (path: string) => Promise<{ size: number; sha256: string }>;
  removeFile: (path: string) => Promise<void>;
  store: BackupStore;
  ping: { success: () => Promise<void>; failure: () => Promise<void> };
  now: () => Date;
  log: (record: Record<string, unknown>) => void;
};

export type BackupStage = 'count' | 'dump' | 'upload' | 'copy';

export type DatabaseBackupResult =
  | { outcome: 'succeeded' | 'shrank' }
  | { outcome: 'failed'; stage: BackupStage };

class BackupStopped extends Error {
  constructor(
    readonly stage: BackupStage,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

const during = async <T>(stage: BackupStage, step: () => Promise<T>) => {
  try {
    return await step();
  } catch (error) {
    throw new BackupStopped(stage, error);
  }
};

// EXT-009 (ADR-0027, runbook «Backups and restore drills»): one logical dump
// a day to the private backup bucket. The row counts taken before the dump
// are a floor for the restore drill, since rows are never deleted
// (ADR-0086). Better Stack hears a success only when the daily dump and the
// month's copy are both stored; a crash that pings nothing is caught as a
// missed heartbeat.
export async function runDatabaseBackup(
  dependencies: DatabaseBackupDependencies,
): Promise<DatabaseBackupResult> {
  const { database, store, log } = dependencies;
  const startedAt = dependencies.now();
  const key = dailyBackupKey(database, startedAt);
  const monthlyKey = monthlyBackupKey(database, startedAt);

  let result: DatabaseBackupResult;
  try {
    const rowCounts = await during('count', dependencies.countRows);
    const path = await during('dump', dependencies.dump);
    let uploaded: { size: number; sha256: string; previous: number | null };
    try {
      uploaded = await during('upload', async () => {
        const file = await dependencies.describeFile(path);
        const previous = await store.latestDailySize();
        await store.upload(key, path, { ...file, rowCounts });
        return { ...file, previous };
      });
      await during('copy', () => store.copy(key, monthlyKey));
    } finally {
      await dependencies.removeFile(path);
    }

    log({
      event: 'database_backup_succeeded',
      key,
      monthlyKey,
      sizeBytes: uploaded.size,
      previousSizeBytes: uploaded.previous,
      sha256: uploaded.sha256,
      rowCounts,
      durationMs: dependencies.now().getTime() - startedAt.getTime(),
    });
    const shrank =
      uploaded.previous !== null && uploaded.size * 2 < uploaded.previous;
    if (shrank) {
      log({
        event: 'database_backup_shrank',
        key,
        sizeBytes: uploaded.size,
        previousSizeBytes: uploaded.previous,
      });
    }
    result = { outcome: shrank ? 'shrank' : 'succeeded' };
  } catch (error) {
    if (!(error instanceof BackupStopped)) throw error;
    log({
      event: 'database_backup_failed',
      stage: error.stage,
      error: error.message,
    });
    result = { outcome: 'failed', stage: error.stage };
  }

  await (result.outcome === 'succeeded'
    ? dependencies.ping.success()
    : dependencies.ping.failure());
  return result;
}
