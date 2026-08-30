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

export const createPgBoss = async (
  connectionString: string,
): Promise<PgBoss> => {
  const { PgBoss } = await import('pg-boss');
  return new PgBoss(pgBossOptions(connectionString));
};

export const startInstalledPgBoss = async (
  boss: StartablePgBoss,
): Promise<void> => {
  if (!(await boss.isInstalled())) {
    throw new Error('pg-boss schema is not installed');
  }

  const version = await boss.schemaVersion();

  if (version !== PG_BOSS_SCHEMA_VERSION) {
    throw new Error(
      `Expected pg-boss schema version ${PG_BOSS_SCHEMA_VERSION} but found ${String(version)}`,
    );
  }

  await boss.start();
};
