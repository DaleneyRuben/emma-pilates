import { NorthflankRequestError } from './northflank-client';
import {
  sha,
  minute,
  build,
  run,
  fakeNorthflank,
  fakeReadiness,
  release,
} from './production-release-test-support';

describe('releaseProduction', () => {
  it('migrates, then builds the API, then waits until readiness reports the commit', async () => {
    const { northflank, calls } = fakeNorthflank();
    const readiness = fakeReadiness([
      { status: 200, release: 'previous' },
      { status: 503 },
      { status: 200, release: sha },
    ]);

    const { result, log } = release(northflank, readiness.fetch);

    await expect(result).resolves.toEqual({ outcome: 'released' });
    // each step starts only after the one before it concluded
    expect(calls).toEqual([
      { operation: 'startJobBuild', args: ['migrate', sha] },
      { operation: 'getJobBuild', args: ['migrate', 'job-build-1'] },
      { operation: 'getJobBuild', args: ['migrate', 'job-build-1'] },
      { operation: 'startJobRun', args: ['migrate'] },
      { operation: 'getJobRun', args: ['migrate', 'run-1'] },
      { operation: 'getJobRun', args: ['migrate', 'run-1'] },
      { operation: 'startServiceBuild', args: ['api', sha] },
      { operation: 'getServiceBuild', args: ['api', 'api-build-1'] },
      { operation: 'getServiceBuild', args: ['api', 'api-build-1'] },
    ]);
    expect(readiness.urls).toHaveLength(3);
    expect(log).toEqual([
      `migrate build job-build-1 started for ${sha}`,
      'migrate build job-build-1 succeeded',
      'migrate run run-1 started',
      'migrate run run-1 succeeded',
      `api build api-build-1 started for ${sha}`,
      'api build api-build-1 succeeded',
      `readiness reports ${sha}`,
      'no worker service configured; worker skipped',
    ]);
  });

  it('touches nothing when a newer commit is already the head of main', async () => {
    const { northflank, journal } = fakeNorthflank();

    const { result } = release(
      northflank,
      fakeReadiness([]).fetch,
      'f'.repeat(40),
    );

    await expect(result).resolves.toEqual({
      outcome: 'superseded',
      detail: `main is at ${'f'.repeat(40)}; its own release will deploy ${sha}'s changes`,
    });
    expect(journal()).toEqual([]);
  });

  it('stops before running migrations when the job build fails', async () => {
    const { northflank, journal } = fakeNorthflank({
      getJobBuild: [build('job-build-1', 'FAILURE')],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'migrate_build',
      detail: 'migrate build job-build-1 ended FAILURE: step 7 failed',
    });
    expect(journal()).not.toContain('startJobRun');
    expect(journal()).not.toContain('startServiceBuild');
  });

  it('never builds the API when the migration run fails', async () => {
    const { northflank, journal } = fakeNorthflank({
      getJobRun: [run('RUNNING'), run('FAILED')],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'migrate_run',
      detail:
        'migrate run run-1 ended FAILED; the API still serves the previous release',
    });
    expect(journal()).not.toContain('startServiceBuild');
  });

  it('reports a failed API build', async () => {
    const { northflank } = fakeNorthflank({
      getServiceBuild: [build('api-build-1', 'CRASHED')],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'api_build',
      detail: 'api build api-build-1 ended CRASHED',
    });
  });

  it('gives up on a build still running after 20 minutes', async () => {
    const { northflank, journal } = fakeNorthflank({
      getJobBuild: [build('job-build-1', 'BUILDING')],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'migrate_build',
      detail: 'migrate build job-build-1 still BUILDING after 20 min',
    });
    expect(journal()).not.toContain('startJobRun');
  });

  it('gives up on a migration run still running after 10 minutes', async () => {
    const { northflank, countOf } = fakeNorthflank({
      getJobRun: [run('RUNNING')],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'migrate_run',
      detail: 'migrate run run-1 still RUNNING after 10 min',
    });
    // one read every 10 s for 10 minutes, plus the read at the start
    expect(countOf('getJobRun')).toBe((10 * minute) / 10_000 + 1);
  });

  it('fails when readiness never reports the commit within 10 minutes', async () => {
    const { northflank } = fakeNorthflank();
    const readiness = fakeReadiness([{ status: 200, release: 'previous' }]);

    const { result } = release(northflank, readiness.fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'readiness',
      detail: `readiness still reports previous after 10 min, expected ${sha}`,
    });
  });

  it('names the last readiness status when the API never became ready', async () => {
    const { northflank } = fakeNorthflank();
    const readiness = fakeReadiness([{ status: 503 }]);

    const { result } = release(northflank, readiness.fetch);

    await expect(result).resolves.toMatchObject({
      outcome: 'failed',
      stage: 'readiness',
      detail: `readiness still answers 503 after 10 min, expected ${sha}`,
    });
  });

  it('rides out up to three network failures in a row while waiting', async () => {
    const blip = new TypeError('fetch failed');
    const { northflank } = fakeNorthflank({
      getJobBuild: [blip, blip, blip, build('job-build-1', 'SUCCESS')],
    });
    const readiness = fakeReadiness([blip, { status: 200, release: sha }]);

    const { result } = release(northflank, readiness.fetch);

    await expect(result).resolves.toEqual({ outcome: 'released' });
  });

  it('fails after a fourth network failure in a row', async () => {
    const blip = new TypeError('fetch failed');
    const { northflank } = fakeNorthflank({
      getJobRun: [blip],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'migrate_run',
      detail: 'reading migrate run run-1 failed 4 times in a row: fetch failed',
    });
  });

  it('fails at once on a Northflank HTTP error while waiting', async () => {
    const { northflank, countOf } = fakeNorthflank({
      getServiceBuild: [
        new NorthflankRequestError(
          'Northflank answered 401 to GET /v1/x: Unauthorized',
        ),
      ],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'api_build',
      detail: 'Northflank answered 401 to GET /v1/x: Unauthorized',
    });
    expect(countOf('getServiceBuild')).toBe(1);
  });

  it('never retries starting a build, so a failed request cannot start two', async () => {
    const { northflank, countOf } = fakeNorthflank({
      startJobBuild: [new TypeError('fetch failed')],
    });

    const { result } = release(northflank, fakeReadiness([]).fetch);

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'migrate_build',
      detail: 'starting the migrate build failed: fetch failed',
    });
    expect(countOf('startJobBuild')).toBe(1);
  });
});
