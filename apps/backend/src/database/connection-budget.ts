export type DatabaseProcess =
  'api' | 'worker' | 'administrator-bootstrap' | 'client-email-verification';

export type DatabasePool = 'prisma' | 'pgboss';

export interface ConnectionBudget {
  prisma: number;
  pgBoss: number;
}

// DATABASE_POOL_MAX is the most connections one process may hold (ADR-0027).
// Only the worker polls queues; elsewhere pg-boss starts, checks its schema,
// and supervises, while jobs are sent through Prisma's transaction.
export const connectionBudget = (
  process: DatabaseProcess,
  maxConnections: number,
): ConnectionBudget => {
  const pgBoss = process === 'worker' ? Math.ceil(maxConnections / 2) : 1;
  return { prisma: maxConnections - pgBoss, pgBoss };
};

export const applicationName = (
  process: DatabaseProcess,
  pool: DatabasePool,
): string => `pilates-${process}-${pool}`;
