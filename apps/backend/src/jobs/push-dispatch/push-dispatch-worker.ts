import type { DispatchPushResult } from '../../notifications/push/dispatch-push';
import type { PushDispatchJob } from './push-dispatch-job';

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

export const registerPushDispatchWorker = (
  boss: PushDispatchWorkerBoss,
  dependencies: PushDispatchWorkerDependencies,
): Promise<void> =>
  Promise.reject(
    new Error(`not implemented ${typeof boss} ${typeof dependencies}`),
  );
