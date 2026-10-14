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

export const runDatabaseBackup = (
  dependencies: DatabaseBackupDependencies,
): Promise<DatabaseBackupResult> =>
  Promise.reject(new Error(`not implemented: ${dependencies.database}`));
