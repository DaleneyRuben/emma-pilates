import {
  NorthflankRequestError,
  type NorthflankBuild,
  type NorthflankClient,
  type ReleaseFetch,
} from './northflank-client';

export type ReleaseClock = {
  now(): number;
  sleep(ms: number): Promise<void>;
};

export type ReleaseStage =
  | 'migrate_build'
  | 'migrate_run'
  | 'api_build'
  | 'readiness'
  | 'worker_build'
  | 'worker_deploy'
  | 'backup_build';

export type ReleaseResult =
  | { outcome: 'released' }
  | { outcome: 'superseded'; detail: string }
  | { outcome: 'failed'; stage: ReleaseStage; detail: string };

const minute = 60_000;
const buildLimitMs = 20 * minute;
const runLimitMs = 10 * minute;
const readinessLimitMs = 10 * minute;
const pollIntervalMs = 10_000;
// Network failures in a row tolerated while waiting; HTTP errors are not.
const tolerableNetworkFailures = 3;
const readinessTimeoutMs = 5_000;

class ReleaseStopped extends Error {
  constructor(
    readonly stage: ReleaseStage,
    detail: string,
  ) {
    super(detail);
  }
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type ReleaseInput = {
  sha: string;
  mainHead: string;
  jobId: string;
  serviceId: string;
  // Null until Northflank's worker service exists (EXT-002).
  workerServiceId: string | null;
  // Null until Northflank's backup job exists (EXT-009).
  backupJobId: string | null;
  readinessUrl: string;
  northflank: NorthflankClient;
  fetch: ReleaseFetch;
  clock: ReleaseClock;
  log: (line: string) => void;
};

// EXT-008 (ADR-0052, ADR-0080): migrations first, the API only after they
// succeeded, then readiness must report the released commit. Each step starts
// only once the one before it concluded; the first failure stops the release.
export async function releaseProduction(
  input: ReleaseInput,
): Promise<ReleaseResult> {
  const { sha, mainHead, jobId, serviceId, northflank, clock, log } = input;
  // A slower CI run for an older merge must not roll production back.
  if (mainHead !== sha) {
    return {
      outcome: 'superseded',
      detail: `main is at ${mainHead}; its own release will deploy ${sha}'s changes`,
    };
  }

  // Polls `read` every 10 s until `settled` returns a value, for at most
  // `limitMs`; `pending` describes the last answer in the timeout message.
  async function waitFor<T, R>(
    stage: ReleaseStage,
    what: string,
    limitMs: number,
    read: () => Promise<T>,
    settled: (answer: T) => R | undefined,
    pending: (answer: T) => string,
    expectation = '',
  ): Promise<R> {
    const startedAt = clock.now();
    let networkFailures = 0;
    for (;;) {
      let answer: T | undefined;
      try {
        answer = await read();
        networkFailures = 0;
      } catch (error) {
        if (error instanceof NorthflankRequestError) {
          throw new ReleaseStopped(stage, error.message);
        }
        networkFailures += 1;
        if (networkFailures > tolerableNetworkFailures) {
          throw new ReleaseStopped(
            stage,
            `reading ${what} failed ${networkFailures} times in a row: ${reason(error)}`,
          );
        }
      }
      const result = answer === undefined ? undefined : settled(answer);
      if (result !== undefined) {
        return result;
      }
      if (clock.now() - startedAt >= limitMs) {
        const state = answer === undefined ? 'unreachable' : pending(answer);
        throw new ReleaseStopped(
          stage,
          `${what} ${state} after ${limitMs / minute} min${expectation}`,
        );
      }
      await clock.sleep(pollIntervalMs);
    }
  }

  async function start<T>(
    stage: ReleaseStage,
    what: string,
    request: () => Promise<T>,
  ): Promise<T> {
    // Never retried: a request that reached Northflank may have started it.
    try {
      return await request();
    } catch (error) {
      throw new ReleaseStopped(
        stage,
        error instanceof NorthflankRequestError
          ? error.message
          : `starting the ${what} failed: ${reason(error)}`,
      );
    }
  }

  async function awaitBuild(
    stage: ReleaseStage,
    name: string,
    started: NorthflankBuild,
    read: (buildId: string) => Promise<NorthflankBuild>,
  ): Promise<void> {
    const what = `${name} build ${started.id}`;
    log(`${what} started for ${sha}`);
    await waitFor(
      stage,
      what,
      buildLimitMs,
      () => read(started.id),
      (build) => {
        if (!build.concluded) {
          return undefined;
        }
        if (!build.success) {
          const message = build.message === null ? '' : `: ${build.message}`;
          throw new ReleaseStopped(
            stage,
            `${what} ended ${build.status}${message}`,
          );
        }
        return true;
      },
      (build) => `still ${build.status}`,
    );
    log(`${what} succeeded`);
  }

  async function readRelease(): Promise<{ status: number; release: unknown }> {
    const response = await input.fetch(input.readinessUrl, {
      method: 'GET',
      headers: {},
      signal: AbortSignal.timeout(readinessTimeoutMs),
    });
    const body: unknown = await response.json().catch(() => null);
    const release =
      typeof body === 'object' && body !== null && 'release' in body
        ? body.release
        : undefined;
    return { status: response.status, release };
  }

  // The worker follows the API on the same commit (ADR-0027). A combined
  // service reports no deployed commit, so its rollout counts once it has
  // completed after this build started.
  async function releaseWorker(): Promise<void> {
    const { workerServiceId } = input;
    if (workerServiceId === null) {
      log('no worker service configured; worker skipped');
      return;
    }
    const buildStartedAt = clock.now();
    const workerBuild = await start(
      'worker_build',
      `${workerServiceId} build`,
      () => northflank.startServiceBuild(workerServiceId, sha),
    );
    await awaitBuild('worker_build', workerServiceId, workerBuild, (buildId) =>
      northflank.getServiceBuild(workerServiceId, buildId),
    );
    await waitFor(
      'worker_deploy',
      `${workerServiceId} rollout`,
      readinessLimitMs,
      () => northflank.getServiceDeployment(workerServiceId),
      (deployment) => {
        if (deployment.status === 'FAILED') {
          throw new ReleaseStopped(
            'worker_deploy',
            `${workerServiceId} rollout ended FAILED`,
          );
        }
        const fresh =
          deployment.transitionedAt !== null &&
          deployment.transitionedAt >= buildStartedAt;
        return deployment.status === 'COMPLETED' && fresh ? true : undefined;
      },
      () => 'still on the previous release',
    );
    log(`${workerServiceId} runs ${sha}`);
  }

  try {
    const jobBuild = await start('migrate_build', `${jobId} build`, () =>
      northflank.startJobBuild(jobId, sha),
    );
    await awaitBuild('migrate_build', jobId, jobBuild, (buildId) =>
      northflank.getJobBuild(jobId, buildId),
    );

    const run = await start('migrate_run', `${jobId} run`, () =>
      northflank.startJobRun(jobId),
    );
    const runName = `${jobId} run ${run.id}`;
    log(`${runName} started`);
    await waitFor(
      'migrate_run',
      runName,
      runLimitMs,
      () => northflank.getJobRun(jobId, run.id),
      (answer) => {
        if (!answer.concluded) {
          return undefined;
        }
        if (answer.status !== 'SUCCESS') {
          throw new ReleaseStopped(
            'migrate_run',
            `${runName} ended ${answer.status}; the API still serves the previous release`,
          );
        }
        return true;
      },
      (answer) => `still ${answer.status}`,
    );
    log(`${runName} succeeded`);

    const serviceBuild = await start('api_build', `${serviceId} build`, () =>
      northflank.startServiceBuild(serviceId, sha),
    );
    await awaitBuild('api_build', serviceId, serviceBuild, (buildId) =>
      northflank.getServiceBuild(serviceId, buildId),
    );

    await waitFor(
      'readiness',
      'readiness',
      readinessLimitMs,
      readRelease,
      (answer) =>
        answer.status === 200 && answer.release === sha ? true : undefined,
      (answer) =>
        answer.status === 200
          ? `still reports ${String(answer.release)}`
          : `still answers ${answer.status}`,
      `, expected ${sha}`,
    );
    log(`readiness reports ${sha}`);

    await releaseWorker();
    return { outcome: 'released' };
  } catch (error) {
    if (error instanceof ReleaseStopped) {
      return { outcome: 'failed', stage: error.stage, detail: error.message };
    }
    throw error;
  }
}
