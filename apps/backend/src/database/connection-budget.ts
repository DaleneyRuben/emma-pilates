export type DatabaseProcess = 'api' | 'worker' | 'administrator-bootstrap';

export type DatabasePool = 'prisma' | 'pgboss';

export interface ConnectionBudget {
  prisma: number;
  pgBoss: number;
}

export const connectionBudget = (
  process: DatabaseProcess,
  maxConnections: number,
): ConnectionBudget => {
  throw new Error(`not implemented: ${process} ${maxConnections}`);
};

export const applicationName = (
  process: DatabaseProcess,
  pool: DatabasePool,
): string => {
  throw new Error(`not implemented: ${process} ${pool}`);
};
