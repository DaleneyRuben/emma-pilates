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
    options: { perJobResults: true },
    handler: FinalizeUploadWorkerHandler,
  ): Promise<string>;
}

export type FinalizeUploadWorkerDependencies = {
  process(job: {
    imageAssetId: string;
  }): Promise<'verified' | 'failed' | 'stale'>;
};

const processJob = async (
  job: FinalizeUploadWorkerJob,
  dependencies: FinalizeUploadWorkerDependencies,
): Promise<FinalizeUploadWorkerResult> => {
  let payload;

  try {
    payload = parseFinalizeUploadJob(job.data);
  } catch {
    return {
      id: job.id,
      status: 'deadletter',
      output: { failureCategory: 'invalid_payload' },
    };
  }

  try {
    const outcome = await dependencies.process(payload);
    return { id: job.id, status: 'completed', output: { outcome } };
  } catch {
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
  await boss.work(
    FINALIZE_UPLOAD_QUEUE,
    { perJobResults: true },
    async (jobs) =>
      Promise.all(jobs.map((job) => processJob(job, dependencies))),
  );
};
