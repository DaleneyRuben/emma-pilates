import {
  type NorthflankBuild,
  type NorthflankClient,
  type NorthflankRun,
  type ReleaseFetch,
} from './northflank-client';
import { releaseBackend, type ReleaseClock } from './backend-release';

// Fakes shared by the production release specs (EXT-008, EXT-002, EXT-009).

export const sha = 'd9ff2e02ec0db4d23d4bceb7eca59730f96f48e9';
export const minute = 60_000;

export function build(id: string, status: string): NorthflankBuild {
  const concluded = ['SUCCESS', 'FAILURE', 'ABORTED', 'CRASHED'].includes(
    status,
  );
  return {
    id,
    status,
    concluded,
    success: status === 'SUCCESS',
    message: status === 'FAILURE' ? 'step 7 failed' : null,
  };
}

export function run(status: string): NorthflankRun {
  return {
    id: 'run-1',
    runName: 'migrate-1',
    status,
    concluded: status !== 'RUNNING',
  };
}

type Operation = keyof NorthflankClient;
type Answers = { [K in Operation]: unknown[] };
type Call = { operation: Operation; args: string[] };

const healthyAnswers: Answers = {
  startJobBuild: [build('job-build-1', 'PENDING')],
  getJobBuild: [
    build('job-build-1', 'BUILDING'),
    build('job-build-1', 'SUCCESS'),
  ],
  startJobRun: [{ id: 'run-1', runName: 'migrate-1' }],
  getJobRun: [run('RUNNING'), run('SUCCESS')],
  startServiceBuild: [build('api-build-1', 'PENDING')],
  getServiceBuild: [
    build('api-build-1', 'BUILDING'),
    build('api-build-1', 'SUCCESS'),
  ],
  getServiceDeployment: [{ status: 'COMPLETED', transitionedAt: null }],
};

// Each operation answers its queued replies in turn and repeats the last one;
// an Error is thrown instead of answered.
export function fakeNorthflank(overrides: Partial<Answers> = {}) {
  const answers = { ...healthyAnswers, ...overrides };
  const calls: Call[] = [];
  const answer =
    (operation: Operation) =>
    (...args: string[]): Promise<never> => {
      const queued = answers[operation];
      const reply = queued[Math.min(countOf(operation), queued.length - 1)];
      calls.push({ operation, args });
      return reply instanceof Error
        ? Promise.reject(reply)
        : Promise.resolve(reply as never);
    };
  const countOf = (operation: Operation) =>
    calls.filter((call) => call.operation === operation).length;
  const northflank: NorthflankClient = {
    startJobBuild: answer('startJobBuild'),
    getJobBuild: answer('getJobBuild'),
    startJobRun: (jobId) => answer('startJobRun')(jobId),
    getJobRun: answer('getJobRun'),
    startServiceBuild: answer('startServiceBuild'),
    getServiceBuild: answer('getServiceBuild'),
    getServiceDeployment: answer('getServiceDeployment'),
  };
  const journal = () => calls.map((call) => call.operation);
  return { northflank, calls, countOf, journal };
}

export function fakeClock(): ReleaseClock {
  let now = 0;
  return {
    now: () => now,
    sleep: (ms) => {
      now += ms;
      return Promise.resolve();
    },
  };
}

// The readiness endpoint answers the queued replies in turn, repeating the last.
export function fakeReadiness(
  replies: ({ status: number; release?: string } | Error)[],
) {
  const urls: string[] = [];
  let index = 0;
  const fetch: ReleaseFetch = (url) => {
    urls.push(url);
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    if (reply instanceof Error) {
      return Promise.reject(reply);
    }
    const body =
      reply.status === 200
        ? { status: 'ready', release: reply.release }
        : { status: 'not_ready' };
    return Promise.resolve(
      new Response(JSON.stringify(body), { status: reply.status }),
    );
  };
  return { urls, fetch };
}

export function release(
  northflank: NorthflankClient,
  fetch: ReleaseFetch,
  mainHead: string | null = sha,
  workerServiceId: string | null = null,
  backupJobId: string | null = null,
) {
  const log: string[] = [];
  const result = releaseBackend({
    sha,
    mainHead,
    jobId: 'migrate',
    serviceId: 'api',
    workerServiceId,
    backupJobId,
    readinessUrl: 'https://api.example.com/health/ready',
    northflank,
    fetch,
    clock: fakeClock(),
    log: (line) => log.push(line),
  });
  return { result, log };
}
