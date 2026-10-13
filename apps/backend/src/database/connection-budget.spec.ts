import { applicationName, connectionBudget } from './connection-budget';

describe('connection budget', () => {
  it('gives the API one pg-boss connection and Prisma the rest', () => {
    expect(connectionBudget('api', 4)).toEqual({ prisma: 3, pgBoss: 1 });
    expect(connectionBudget('api', 10)).toEqual({ prisma: 9, pgBoss: 1 });
  });

  it('splits the worker between pg-boss and Prisma', () => {
    expect(connectionBudget('worker', 4)).toEqual({ prisma: 2, pgBoss: 2 });
    expect(connectionBudget('worker', 5)).toEqual({ prisma: 2, pgBoss: 3 });
  });

  it('treats the administrator bootstrap like the API', () => {
    expect(connectionBudget('administrator-bootstrap', 2)).toEqual({
      prisma: 1,
      pgBoss: 1,
    });
  });

  it('never exceeds the process limit', () => {
    for (const process of ['api', 'worker'] as const) {
      for (let max = 2; max <= 20; max += 1) {
        const { prisma, pgBoss } = connectionBudget(process, max);
        expect(prisma + pgBoss).toBe(max);
        expect(Math.min(prisma, pgBoss)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('names each pool after its process so pg_stat_activity shows the owner', () => {
    expect(applicationName('api', 'prisma')).toBe('pilates-api-prisma');
    expect(applicationName('worker', 'pgboss')).toBe('pilates-worker-pgboss');
  });
});
