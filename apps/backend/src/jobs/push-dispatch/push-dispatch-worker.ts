import type { DispatchPushResult } from '../../notifications/push/dispatch-push';
import {
  PermanentPushError,
  TransientPushError,
} from '../../notifications/push/push-provider';
import {
  PUSH_DISPATCH_QUEUE,
  parsePushDispatchJob,
  type PushDispatchJob,
} from './push-dispatch-job';

type PushDispatchWorkerJob = { id: string; data: unknown };

type PushDispatchWorkerResult = {
  id: string;
  status: 'completed' | 'failed' | 'deadletter';
  output: DispatchPushResult | { failureCategory: string };
};

export type PushDispatchWorkerHandler = (
  jobs: PushDispatchWorkerJob[],
) => Promise<PushDispatchWorkerResult[]>;

export interface PushDispatchWorkerBoss {
  work(
    name: string,
    options: { perJobResults: true },
    handler: PushDispatchWorkerHandler,
  ): Promise<string>;
}

export type PushDispatchWorkerDependencies = {
  dispatch: (job: PushDispatchJob) => Promise<DispatchPushResult>;
  reportError?: (error: unknown, context: { job: string }) => void;
};

const processJob = async (
  job: PushDispatchWorkerJob,
  dependencies: PushDispatchWorkerDependencies,
): Promise<PushDispatchWorkerResult> => {
  const fail = (
    status: 'failed' | 'deadletter',
    failureCategory: string,
  ): PushDispatchWorkerResult => ({
    id: job.id,
    status,
    output: { failureCategory },
  });
  let payload: PushDispatchJob;

  try {
    payload = parsePushDispatchJob(job.data);
  } catch (error) {
    dependencies.reportError?.(error, { job: PUSH_DISPATCH_QUEUE });
    return fail('deadletter', 'invalid_payload');
  }

  try {
    const output = await dependencies.dispatch(payload);
    return { id: job.id, status: 'completed', output };
  } catch (error) {
    // ADR-0064: temporary provider trouble retries with backoff; a payload or
    // credential problem stops at once and alerts (ADR-0066).
    if (error instanceof TransientPushError) {
      return fail('failed', error.category);
    }
    dependencies.reportError?.(error, { job: PUSH_DISPATCH_QUEUE });
    return error instanceof PermanentPushError
      ? fail('deadletter', error.category)
      : fail('failed', 'unexpected');
  }
};

export const registerPushDispatchWorker = async (
  boss: PushDispatchWorkerBoss,
  dependencies: PushDispatchWorkerDependencies,
): Promise<void> => {
  await boss.work(PUSH_DISPATCH_QUEUE, { perJobResults: true }, (jobs) =>
    Promise.all(jobs.map((job) => processJob(job, dependencies))),
  );
};
