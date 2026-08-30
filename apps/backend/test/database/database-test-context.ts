import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Pool } from 'pg';

const backendRoot = resolve(__dirname, '../..');
const disposableDatabasePrefix = 'pilates_test_';

export type DatabaseTestContext = {
  pool: Pool;
  stop: () => Promise<void>;
};

const assertDisposableOverride = (databaseUrl: string): void => {
  const databaseName = new URL(databaseUrl).pathname.slice(1);

  if (!databaseName.startsWith(disposableDatabasePrefix)) {
    throw new Error(
      `TEST_DATABASE_URL must target a database named ${disposableDatabasePrefix}*`,
    );
  }
};

const applyMigrations = (databaseUrl: string): void => {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'pipe',
  });
};

export const startDatabaseTestContext =
  async (): Promise<DatabaseTestContext> => {
    const databaseOverride = process.env.TEST_DATABASE_URL;
    let container: StartedPostgreSqlContainer | undefined;
    let databaseUrl: string;

    if (databaseOverride) {
      assertDisposableOverride(databaseOverride);
      databaseUrl = databaseOverride;
    } else {
      container = await new PostgreSqlContainer('postgres:17-alpine')
        .withDatabase('pilates_test_container')
        .start();
      databaseUrl = container.getConnectionUri();
    }

    if (process.env.SKIP_TEST_MIGRATIONS !== 'true') {
      applyMigrations(databaseUrl);
    }

    const pool = new Pool({ connectionString: databaseUrl });

    return {
      pool,
      stop: async () => {
        await pool.end();
        await container?.stop();
      },
    };
  };
