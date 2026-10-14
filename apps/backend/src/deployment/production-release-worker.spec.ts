import {
  build,
  fakeNorthflank,
  fakeReadiness,
  minute,
  release,
  sha,
} from './production-release-test-support';

const ready = () => fakeReadiness([{ status: 200, release: sha }]);
const later = 10 * 60 * minute;

const workerAnswers = {
  startServiceBuild: [
    build('api-build-1', 'PENDING'),
    build('worker-build-1', 'PENDING'),
  ],
  getServiceBuild: [
    build('api-build-1', 'SUCCESS'),
    build('worker-build-1', 'BUILDING'),
    build('worker-build-1', 'SUCCESS'),
  ],
};

describe('releaseProduction with the worker (EXT-002)', () => {
  it('builds the worker after the API is ready and waits for its new rollout', async () => {
    const { northflank, calls } = fakeNorthflank({
      ...workerAnswers,
      getServiceDeployment: [
        // the previous rollout, from before the build started
        { status: 'COMPLETED', transitionedAt: -1 },
        { status: 'IN_PROGRESS', transitionedAt: later },
        { status: 'COMPLETED', transitionedAt: later },
      ],
    });

    const { result, log } = release(northflank, ready().fetch, sha, 'worker');

    await expect(result).resolves.toEqual({ outcome: 'released' });
    expect(calls.slice(-6)).toEqual([
      { operation: 'startServiceBuild', args: ['worker', sha] },
      { operation: 'getServiceBuild', args: ['worker', 'worker-build-1'] },
      { operation: 'getServiceBuild', args: ['worker', 'worker-build-1'] },
      { operation: 'getServiceDeployment', args: ['worker'] },
      { operation: 'getServiceDeployment', args: ['worker'] },
      { operation: 'getServiceDeployment', args: ['worker'] },
    ]);
    expect(log.slice(-5, -1)).toEqual([
      `readiness reports ${sha}`,
      `worker build worker-build-1 started for ${sha}`,
      'worker build worker-build-1 succeeded',
      `worker runs ${sha}`,
    ]);
  });

  it('skips the worker while no worker service is configured', async () => {
    const { northflank, journal } = fakeNorthflank();

    const { result, log } = release(northflank, ready().fetch);

    await expect(result).resolves.toEqual({ outcome: 'released' });
    expect(journal()).not.toContain('getServiceDeployment');
    expect(journal().filter((step) => step === 'startServiceBuild')).toEqual([
      'startServiceBuild',
    ]);
    expect(log).toContain('no worker service configured; worker skipped');
  });

  it('reports a failed worker build while the API already runs the commit', async () => {
    const { northflank } = fakeNorthflank({
      ...workerAnswers,
      getServiceBuild: [
        build('api-build-1', 'SUCCESS'),
        build('worker-build-1', 'FAILURE'),
      ],
    });

    const { result } = release(northflank, ready().fetch, sha, 'worker');

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'worker_build',
      detail: 'worker build worker-build-1 ended FAILURE: step 7 failed',
    });
  });

  it('reports a failed worker rollout', async () => {
    const { northflank } = fakeNorthflank({
      ...workerAnswers,
      getServiceDeployment: [{ status: 'FAILED', transitionedAt: later }],
    });

    const { result } = release(northflank, ready().fetch, sha, 'worker');

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'worker_deploy',
      detail: 'worker rollout ended FAILED',
    });
  });

  it('gives up on a worker rollout that never completes within 10 minutes', async () => {
    const { northflank } = fakeNorthflank({
      ...workerAnswers,
      getServiceDeployment: [{ status: 'COMPLETED', transitionedAt: -1 }],
    });

    const { result } = release(northflank, ready().fetch, sha, 'worker');

    await expect(result).resolves.toEqual({
      outcome: 'failed',
      stage: 'worker_deploy',
      detail: 'worker rollout still on the previous release after 10 min',
    });
  });
});
