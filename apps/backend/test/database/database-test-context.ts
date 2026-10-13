import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { prismaSessionOptions } from '../../src/database/prisma-adapter';

const backendRoot = resolve(process.cwd());
const disposableDatabasePrefix = 'pilates_test_';
const watchdogScript = resolve(
  backendRoot,
  'test/database/disposable-database-watchdog.ts',
);

export type DatabaseTestContext = {
  databaseUrl: string;
  pool: Pool;
  stop: () => Promise<void>;
};

const databaseName = (databaseUrl: string): string =>
  new URL(databaseUrl).pathname.slice(1);

const assertDisposableOverride = (databaseUrl: string): void => {
  if (!databaseName(databaseUrl).startsWith(disposableDatabasePrefix)) {
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

const runAsAdmin = async (
  adminUrl: string,
  statement: string,
): Promise<void> => {
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  try {
    await admin.query(statement);
  } finally {
    await admin.end();
  }
};

// Jest hands every test file a copy of process, so a signal listener here
// never runs, and a signal, crash, or run that ends without stop skips the
// drop below. A detached watchdog outlives this process instead: it drops
// this one database by name when its stdin closes before stop releases it.
const watchDisposableDatabase = (
  adminUrl: string,
  name: string,
): (() => Promise<void>) => {
  const watchdog = spawn(process.execPath, [watchdogScript], {
    detached: true,
    stdio: ['pipe', 'ignore', 'ignore'],
    env: {
      ...process.env,
      NODE_OPTIONS: '',
      WATCHDOG_ADMIN_URL: adminUrl,
      WATCHDOG_DATABASE: name,
    },
  });
  watchdog.unref();

  return () =>
    new Promise((done) => {
      watchdog.stdin.end('release', done);
    });
};

// TEST_DATABASE_URL names a server (through a pilates_test_* admin database);
// every context still gets its own database there, like a container would.
const createDisposableDatabase = async (
  adminUrl: string,
): Promise<{ databaseUrl: string; drop: () => Promise<void> }> => {
  const name = `${disposableDatabasePrefix}${randomBytes(6).toString('hex')}`;
  const releaseWatchdog = watchDisposableDatabase(adminUrl, name);
  await runAsAdmin(adminUrl, `create database "${name}"`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;

  return {
    databaseUrl: url.toString(),
    drop: async () => {
      await runAsAdmin(
        adminUrl,
        `drop database if exists "${name}" with (force)`,
      );
      await releaseWatchdog();
    },
  };
};

export const startDatabaseTestContext =
  async (): Promise<DatabaseTestContext> => {
    const databaseOverride = process.env.TEST_DATABASE_URL;
    let container: StartedPostgreSqlContainer | undefined;
    let dropDatabase: () => Promise<void> = () => Promise.resolve();
    let databaseUrl: string;

    if (databaseOverride) {
      assertDisposableOverride(databaseOverride);
      const disposable = await createDisposableDatabase(databaseOverride);
      databaseUrl = disposable.databaseUrl;
      dropDatabase = disposable.drop;
    } else {
      container = await new PostgreSqlContainer('postgres:18-alpine')
        .withDatabase('pilates_test_container')
        .start();
      databaseUrl = container.getConnectionUri();
    }

    applyMigrations(databaseUrl);

    const pool = new Pool({
      connectionString: databaseUrl,
      options: prismaSessionOptions,
    });

    return {
      databaseUrl,
      pool,
      stop: async () => {
        await pool.end();
        await dropDatabase();
        await container?.stop();
      },
    };
  };
