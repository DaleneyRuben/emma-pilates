import type { PgBoss } from 'pg-boss';
import { PrismaClient } from '../generated/prisma/client';
import { createPgBoss } from '../jobs/pg-boss-runtime';
import {
  applicationName,
  connectionBudget,
  type DatabaseProcess,
} from './connection-budget';
import { createPrismaAdapter } from './prisma-adapter';

export interface DatabaseClients {
  prisma: PrismaClient;
  boss: PgBoss;
}

export interface DatabaseSettings {
  DATABASE_URL: string;
  DATABASE_POOL_MAX: number;
}

export const createDatabasePrisma = (
  process: DatabaseProcess,
  settings: DatabaseSettings,
): PrismaClient =>
  new PrismaClient({
    adapter: createPrismaAdapter(
      settings.DATABASE_URL,
      connectionBudget(process, settings.DATABASE_POOL_MAX).prisma,
      applicationName(process, 'prisma'),
    ),
  });

// The pg-boss instance is returned unstarted; callers start it with
// startInstalledPgBoss once the process is ready to use jobs.
export const createDatabasePgBoss = (
  process: DatabaseProcess,
  settings: DatabaseSettings,
): PgBoss =>
  createPgBoss(settings.DATABASE_URL, {
    poolMax: connectionBudget(process, settings.DATABASE_POOL_MAX).pgBoss,
    applicationName: applicationName(process, 'pgboss'),
  });

export const createDatabaseClients = (
  process: DatabaseProcess,
  settings: DatabaseSettings,
): DatabaseClients => ({
  prisma: createDatabasePrisma(process, settings),
  boss: createDatabasePgBoss(process, settings),
});
