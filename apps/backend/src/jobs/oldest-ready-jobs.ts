import type { OldestReadyJob } from './worker-progress';

export type SqlExecutor = {
  executeSql(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
};

export const readOldestReadyJobs = async (
  db: SqlExecutor,
  queues: string[],
): Promise<OldestReadyJob[]> => {
  void db;
  return Promise.resolve(queues.map((queue) => ({ queue, readySince: null })));
};
