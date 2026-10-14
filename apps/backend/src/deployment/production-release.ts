import type { NorthflankClient, ReleaseFetch } from './northflank-client';

export type ReleaseClock = {
  now(): number;
  sleep(ms: number): Promise<void>;
};

export type ReleaseStage =
  'migrate_build' | 'migrate_run' | 'api_build' | 'readiness';

export type ReleaseResult =
  | { outcome: 'released' }
  | { outcome: 'superseded'; detail: string }
  | { outcome: 'failed'; stage: ReleaseStage; detail: string };

export function releaseProduction(input: {
  sha: string;
  mainHead: string;
  jobId: string;
  serviceId: string;
  readinessUrl: string;
  northflank: NorthflankClient;
  fetch: ReleaseFetch;
  clock: ReleaseClock;
  log: (line: string) => void;
}): Promise<ReleaseResult> {
  return Promise.reject(new Error(`not implemented for ${input.sha}`));
}
