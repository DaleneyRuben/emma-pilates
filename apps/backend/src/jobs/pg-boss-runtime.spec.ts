import { pgBossOptions, startInstalledPgBoss } from './pg-boss-runtime';

describe('pg-boss runtime', () => {
  it('disables runtime schema changes and unused persistence', () => {
    expect(pgBossOptions('postgresql://localhost/pilates')).toMatchObject({
      connectionString: 'postgresql://localhost/pilates',
      schema: 'pgboss',
      migrate: false,
      createSchema: false,
      persistQueueStats: false,
      useListenNotify: false,
    });
  });

  it('refuses a missing pg-boss schema without starting', async () => {
    const boss = {
      isInstalled: jest.fn().mockResolvedValue(false),
      schemaVersion: jest.fn(),
      start: jest.fn(),
    };

    await expect(startInstalledPgBoss(boss)).rejects.toThrow(
      'pg-boss schema is not installed',
    );
    expect(boss.start).not.toHaveBeenCalled();
  });

  it('refuses an outdated pg-boss schema without migrating it', async () => {
    const boss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(37),
      start: jest.fn(),
    };

    await expect(startInstalledPgBoss(boss)).rejects.toThrow(
      'Expected pg-boss schema version 38 but found 37',
    );
    expect(boss.start).not.toHaveBeenCalled();
  });

  it('starts an installed schema at the pinned version', async () => {
    const boss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(38),
      start: jest.fn().mockResolvedValue(undefined),
    };

    await startInstalledPgBoss(boss);

    expect(boss.start).toHaveBeenCalledTimes(1);
  });
});
