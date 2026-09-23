import { checkReadiness } from './readiness';

const expectedMigrations = [
  '20260908000000_booking_catalog',
  '20260922000000_payments',
];

describe('checkReadiness', () => {
  it('is ready when every deployed migration has been applied', async () => {
    await expect(
      checkReadiness({
        appliedMigrations: () =>
          Promise.resolve([...expectedMigrations, '20260801000000_older']),
        expectedMigrations,
        shuttingDown: () => false,
        timeoutMs: 50,
      }),
    ).resolves.toBe(true);
  });

  it('is not ready while a deployed migration is still unapplied', async () => {
    await expect(
      checkReadiness({
        appliedMigrations: () => Promise.resolve([expectedMigrations[0]]),
        expectedMigrations,
        shuttingDown: () => false,
        timeoutMs: 50,
      }),
    ).resolves.toBe(false);
  });

  it('is not ready when PostgreSQL cannot be reached', async () => {
    await expect(
      checkReadiness({
        appliedMigrations: () =>
          Promise.reject(new Error('connect ECONNREFUSED')),
        expectedMigrations,
        shuttingDown: () => false,
        timeoutMs: 50,
      }),
    ).resolves.toBe(false);
  });

  it('gives up on a PostgreSQL probe that outlives the short timeout', async () => {
    await expect(
      checkReadiness({
        appliedMigrations: () => new Promise(() => undefined),
        expectedMigrations,
        shuttingDown: () => false,
        timeoutMs: 20,
      }),
    ).resolves.toBe(false);
  });

  it('fails during graceful shutdown without probing PostgreSQL', async () => {
    const appliedMigrations = jest.fn(() =>
      Promise.resolve(expectedMigrations),
    );

    await expect(
      checkReadiness({
        appliedMigrations,
        expectedMigrations,
        shuttingDown: () => true,
        timeoutMs: 50,
      }),
    ).resolves.toBe(false);
    expect(appliedMigrations).not.toHaveBeenCalled();
  });
});
