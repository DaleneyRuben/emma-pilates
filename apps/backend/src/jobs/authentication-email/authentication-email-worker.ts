import {
  classifyAuthenticationEmailFailure,
  type AuthenticationEmailFailureCategory,
} from './authentication-email-failure';
import {
  AUTHENTICATION_EMAIL_QUEUE,
  parseAuthenticationEmailJob,
} from './authentication-email-job';
import {
  processAuthenticationEmail,
  type AuthenticationEmailProcessorDependencies,
} from './process-authentication-email';

type AuthenticationEmailWorkerJob = {
  id: string;
  data: unknown;
};

type AuthenticationEmailWorkerOutput =
  | { outcome: 'delivered' | 'stale' | 'suppressed' }
  | {
      failureCategory: AuthenticationEmailFailureCategory | 'invalid_payload';
    };

type AuthenticationEmailWorkerResult = {
  id: string;
  status: 'completed' | 'failed' | 'deadletter';
  output: AuthenticationEmailWorkerOutput;
};

export type AuthenticationEmailWorkerHandler = (
  jobs: AuthenticationEmailWorkerJob[],
) => Promise<AuthenticationEmailWorkerResult[]>;

export interface AuthenticationEmailWorkerBoss {
  work(
    name: string,
    options: { perJobResults: true },
    handler: AuthenticationEmailWorkerHandler,
  ): Promise<string>;
}

const processJob = async (
  job: AuthenticationEmailWorkerJob,
  dependencies: AuthenticationEmailProcessorDependencies,
  now: () => Date,
): Promise<AuthenticationEmailWorkerResult> => {
  let payload;

  try {
    payload = parseAuthenticationEmailJob(job.data);
  } catch {
    return {
      id: job.id,
      status: 'deadletter',
      output: { failureCategory: 'invalid_payload' },
    };
  }

  try {
    const outcome = await processAuthenticationEmail(
      payload,
      now(),
      dependencies,
    );
    return { id: job.id, status: 'completed', output: { outcome } };
  } catch (error) {
    const failure = classifyAuthenticationEmailFailure(error);
    return {
      id: job.id,
      status: failure.retryable ? 'failed' : 'deadletter',
      output: { failureCategory: failure.category },
    };
  }
};

export const registerAuthenticationEmailWorker = async (
  boss: AuthenticationEmailWorkerBoss,
  dependencies: AuthenticationEmailProcessorDependencies,
  now: () => Date = () => new Date(),
): Promise<void> => {
  await boss.work(
    AUTHENTICATION_EMAIL_QUEUE,
    { perJobResults: true },
    async (jobs) =>
      Promise.all(jobs.map((job) => processJob(job, dependencies, now))),
  );
};
