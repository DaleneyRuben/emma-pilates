export type OldestReadyJob = {
  queue: string;
  readySince: Date | null;
};

export type SweepProgress = {
  job: string;
  intervalMs: number;
  // The worker's start until the sweep first succeeds.
  lastSuccessAt: Date;
};

type ProgressSnapshot = {
  now: Date;
  oldestReadyJobs: OldestReadyJob[];
  sweeps: SweepProgress[];
};

const queueStuckAfterMs = 5 * 60_000;
const sweepGraceMs = 2 * 60_000;

// ADR-0066: the heartbeat proves progress, not just a live process. A queue
// is stuck once its oldest ready job has waited five minutes; a sweep is stale
// once twice its interval plus two minutes pass without a success.
export const findProgressStalls = ({
  now,
  oldestReadyJobs,
  sweeps,
}: ProgressSnapshot): string[] => [
  ...oldestReadyJobs
    .filter(
      ({ readySince }) =>
        readySince !== null &&
        now.getTime() - readySince.getTime() >= queueStuckAfterMs,
    )
    .map(({ queue }) => `queue_stuck:${queue}`),
  ...sweeps
    .filter(
      ({ intervalMs, lastSuccessAt }) =>
        now.getTime() - lastSuccessAt.getTime() > 2 * intervalMs + sweepGraceMs,
    )
    .map(({ job }) => `sweep_stale:${job}`),
];
