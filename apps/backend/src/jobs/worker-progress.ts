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

export const findProgressStalls = (snapshot: ProgressSnapshot): string[] => {
  void snapshot;
  return [];
};
