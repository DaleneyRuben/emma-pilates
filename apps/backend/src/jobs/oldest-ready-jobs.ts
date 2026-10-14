import type { OldestReadyJob } from './worker-progress';

export type SqlExecutor = {
  executeSql(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
};

type OldestReadyRow = { queue: string; ready_since: Date | null };

// ADR-0066: a job is ready once it is created or retrying and its start time
// has passed, so a retry still waiting out its backoff is not counted.
// Read-only, on pg-boss's own pool: no extra connection.
const oldestReadyJobsSql = `
  select queues.name as queue, min(job.start_after) as ready_since
    from unnest($1::text[]) with ordinality as queues(name, position)
    left join pgboss.job job
      on job.name = queues.name
     and job.state in ('created', 'retry')
     and job.start_after <= now()
   group by queues.name, queues.position
   order by queues.position`;

export const readOldestReadyJobs = async (
  db: SqlExecutor,
  queues: string[],
): Promise<OldestReadyJob[]> => {
  const { rows } = await db.executeSql(oldestReadyJobsSql, [queues]);

  return (rows as OldestReadyRow[]).map(({ queue, ready_since }) => ({
    queue,
    readySince: ready_since === null ? null : new Date(ready_since),
  }));
};
