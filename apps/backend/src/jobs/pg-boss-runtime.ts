import type { ConstructorOptions, PgBoss } from 'pg-boss';

export const PG_BOSS_SCHEMA_VERSION = 38;

export interface StartablePgBoss {
  isInstalled(): Promise<boolean>;
  schemaVersion(): Promise<number | null>;
  start(): Promise<unknown>;
}

export const pgBossOptions = (
  connectionString: string,
): ConstructorOptions => ({
  connectionString,
  schema: 'pgboss',
  migrate: false,
  createSchema: false,
  schedule: false,
  persistWarnings: false,
  persistQueueStats: false,
  useListenNotify: false,
});

type PgBossErrorReport = { event: 'pg_boss_error'; message: string };

const logPgBossError = (report: PgBossErrorReport): void => {
  console.error(JSON.stringify(report));
};

// pg-boss emits connection failures as 'error' events; without a listener
// Node terminates the process.
export const createPgBoss = async (
  connectionString: string,
  report: (record: PgBossErrorReport) => void = logPgBossError,
): Promise<PgBoss> => {
  const { PgBoss } = await import('pg-boss');
  const boss = new PgBoss(pgBossOptions(connectionString));
  boss.on('error', (error: Error) => {
    report({ event: 'pg_boss_error', message: error.message });
  });
  return boss;
};

export const startInstalledPgBoss = async (
  boss: StartablePgBoss,
): Promise<void> => {
  await boss.start();

  if (!(await boss.isInstalled())) {
    throw new Error('pg-boss schema is not installed');
  }

  const version = await boss.schemaVersion();

  if (version !== PG_BOSS_SCHEMA_VERSION) {
    throw new Error(
      `Expected pg-boss schema version ${PG_BOSS_SCHEMA_VERSION} but found ${String(version)}`,
    );
  }
};
