import {
  createPgBoss,
  pgBossOptions,
  startInstalledPgBoss,
} from './pg-boss-runtime';

// The unit suite resolves pg-boss to the double in src/__mocks__.

describe('pg-boss runtime', () => {
  it('constructs the job client with the pinned options', () => {
    const boss = createPgBoss('postgresql://localhost/unused');

    expect(boss).toHaveProperty(
      'options',
      pgBossOptions('postgresql://localhost/unused'),
    );
  });

  it('reports pg-boss errors instead of crashing the process', () => {
    const report = jest.fn();
    const boss = createPgBoss('postgresql://localhost/unused', { report });

    expect(boss.listenerCount('error')).toBe(1);
    boss.emit(
      'error',
      new Error('Connection terminated due to connection timeout'),
    );
    expect(report).toHaveBeenCalledWith({
      event: 'pg_boss_error',
      message: 'Connection terminated due to connection timeout',
    });
  });

  it('caps the job client pool at the configured size', () => {
    const boss = createPgBoss('postgresql://localhost/unused', { poolMax: 2 });

    expect(boss).toHaveProperty(
      'options',
      pgBossOptions('postgresql://localhost/unused', 2),
    );
    expect(pgBossOptions('postgresql://localhost/unused', 2)).toMatchObject({
      max: 2,
    });
  });

  it('tags pg-boss connections with the owning process', () => {
    const boss = createPgBoss('postgresql://localhost/unused', {
      poolMax: 1,
      applicationName: 'pilates-api-pgboss',
    });

    expect(boss).toHaveProperty(
      'options',
      expect.objectContaining({
        max: 1,
        application_name: 'pilates-api-pgboss',
      }),
    );
  });

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

  it('refuses a missing pg-boss schema after opening the connection', async () => {
    const boss = {
      isInstalled: jest.fn().mockResolvedValue(false),
      schemaVersion: jest.fn(),
      start: jest.fn(),
    };

    await expect(startInstalledPgBoss(boss)).rejects.toThrow(
      'pg-boss schema is not installed',
    );
    expect(boss.start).toHaveBeenCalledTimes(1);
  });

  it('refuses an outdated pg-boss schema after opening the connection', async () => {
    const boss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(37),
      start: jest.fn(),
    };

    await expect(startInstalledPgBoss(boss)).rejects.toThrow(
      'Expected pg-boss schema version 38 but found 37',
    );
    expect(boss.start).toHaveBeenCalledTimes(1);
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
