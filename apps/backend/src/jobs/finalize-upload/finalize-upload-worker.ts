import {
  FINALIZE_UPLOAD_QUEUE,
  parseFinalizeUploadJob,
} from './finalize-upload-job';

type FinalizeUploadWorkerJob = {
  id: string;
  data: unknown;
};

type FinalizeUploadWorkerOutput =
  | { outcome: 'verified' | 'failed' | 'stale' }
  | { failureCategory: 'invalid_payload' | 'unexpected' };

type FinalizeUploadWorkerResult = {
  id: string;
  status: 'completed' | 'failed' | 'deadletter';
  output: FinalizeUploadWorkerOutput;
};

export type FinalizeUploadWorkerHandler = (
  jobs: FinalizeUploadWorkerJob[],
) => Promise<FinalizeUploadWorkerResult[]>;

export interface FinalizeUploadWorkerBoss {
  work(
    name: string,
    options: { perJobResults: true; pollingIntervalSeconds: number },
    handler: FinalizeUploadWorkerHandler,
  ): Promise<string>;
}

export type FinalizeUploadWorkerDependencies = {
  process(job: {
    imageAssetId: string;
  }): Promise<'verified' | 'failed' | 'stale'>;
  reportError?: (error: unknown, context: { job: string }) => void;
};

const processJob = async (
  job: FinalizeUploadWorkerJob,
  dependencies: FinalizeUploadWorkerDependencies,
): Promise<FinalizeUploadWorkerResult> => {
  let payload;

  try {
    payload = parseFinalizeUploadJob(job.data);
  } catch (error) {
    dependencies.reportError?.(error, { job: FINALIZE_UPLOAD_QUEUE });
    return {
      id: job.id,
      status: 'deadletter',
      output: { failureCategory: 'invalid_payload' },
    };
  }

  try {
    const outcome = await dependencies.process(payload);
    return { id: job.id, status: 'completed', output: { outcome } };
  } catch (error) {
    dependencies.reportError?.(error, { job: FINALIZE_UPLOAD_QUEUE });
    return {
      id: job.id,
      status: 'failed',
      output: { failureCategory: 'unexpected' },
    };
  }
};

export const registerFinalizeUploadWorker = async (
  boss: FinalizeUploadWorkerBoss,
  dependencies: FinalizeUploadWorkerDependencies,
): Promise<void> => {
  // A Client is waiting for READY (UPL-003), so this queue is polled every
  // half second, pg-boss's minimum, instead of the default two.
  await boss.work(
    FINALIZE_UPLOAD_QUEUE,
    { perJobResults: true, pollingIntervalSeconds: 0.5 },
    async (jobs) =>
      Promise.all(jobs.map((job) => processJob(job, dependencies))),
  );
};
