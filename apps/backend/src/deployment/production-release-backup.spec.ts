import {
  build,
  fakeNorthflank,
  fakeReadiness,
  release,
  sha,
} from './production-release-test-support';

const ready = () => fakeReadiness([{ status: 200, release: sha }]);

const backupAnswers = {
  startJobBuild: [
    build('job-build-1', 'PENDING'),
    build('backup-build-1', 'PENDING'),
  ],
  getJobBuild: [
    build('job-build-1', 'SUCCESS'),
    build('backup-build-1', 'BUILDING'),
    build('backup-build-1', 'SUCCESS'),
  ],
};

describe('releaseProduction with the backup job (EXT-009)', () => {
  // The scheduled job runs the image of the last released commit; the
  // release only builds it, never runs it.
  it('builds the backup job on the commit after the worker, without running it', async () => {
    const { northflank, calls } = fakeNorthflank(backupAnswers);

    const { result, log } = release(
      northflank,
      ready().fetch,
      sha,
      'worker',
      'backup',
    );

    await expect(result).resolves.toEqual({ outcome: 'released' });
    expect(calls.slice(-3)).toEqual([
      { operation: 'startJobBuild', args: ['backup', sha] },
      { operation: 'getJobBuild', args: ['backup', 'backup-build-1'] },
      { operation: 'getJobBuild', args: ['backup', 'backup-build-1'] },
    ]);
    expect(
      calls.filter((call) => call.operation === 'startJobRun'),
    ).toHaveLength(1);
    expect(log.slice(-3)).toEqual([
      `worker runs ${sha}`,
      `backup build backup-build-1 started for ${sha}`,
      'backup build backup-build-1 succeeded',
    ]);
  });

  it('skips the backup job while none is configured', async () => {
    const { northflank, journal } = fakeNorthflank();

    const { result, log } = release(northflank, ready().fetch, sha, 'worker');

    await expect(result).resolves.toEqual({ outcome: 'released' });
    expect(
      journal().filter((operation) => operation === 'startJobBuild'),
    ).toHaveLength(1);
    expect(log.at(-1)).toBe('no backup job configured; backup skipped');
  });

  it('reports a failed backup build after the API and worker run the commit', async () => {
    const { northflank } = fakeNorthflank({
      ...backupAnswers,
      getJobBuild: [
        build('job-build-1', 'SUCCESS'),
        build('backup-build-1', 'FAILURE'),
      ],
    });

    const { result } = release(
      northflank,
      ready().fetch,
      sha,
      'worker',
      'backup',
    );

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'backup_build',
      detail: 'backup build backup-build-1 ended FAILURE: step 7 failed',
    });
  });
});
