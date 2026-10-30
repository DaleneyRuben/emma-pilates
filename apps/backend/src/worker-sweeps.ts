import type { SweepProgress } from './jobs/worker-progress';

export type SweepStep = {
  // Names the sweep in logs: a failure is logged as `<job>_failed`.
  job: string;
  execute(): Promise<unknown>;
};

// Steps of one group share a timer and run in order.
export type SweepGroup = {
  intervalMs: number;
  steps: SweepStep[];
};

type SweepDependencies = {
  serviceVersion: string;
  emit(record: unknown): void;
  reportError(error: unknown, context: { job: string }): void;
  now?: () => Date;
};

export type RunningSweeps = {
  stop: () => void;
  progress: () => SweepProgress[];
};

// Each group runs once at startup, then on its interval. A failed step is
// logged and reported, and the worker keeps running (EXT-002, EXT-011).
export const startSweeps = async (
  groups: SweepGroup[],
  dependencies: SweepDependencies,
): Promise<RunningSweeps> => {
  const now = dependencies.now ?? (() => new Date());
  const startedAt = now();
  const lastSuccessAt = new Map<string, Date>();
  const runStep = (step: SweepStep) =>
    step.execute().then(
      () => {
        lastSuccessAt.set(step.job, now());
      },
      (error: unknown) => {
        dependencies.reportError(error, { job: step.job });
        dependencies.emit({
          event: `${step.job}_failed`,
          serviceVersion: dependencies.serviceVersion,
        });
      },
    );
  const runGroup = async (group: SweepGroup) => {
    for (const step of group.steps) {
      await runStep(step);
    }
  };

  const timers: NodeJS.Timeout[] = [];
  const running = new Set<SweepGroup>();
  const guarded = async (group: SweepGroup) => {
    if (running.has(group)) return;
    running.add(group);
    try {
      await runGroup(group);
    } finally {
      const finished = [...running].filter((current) => current !== group);
      running.clear();
      for (const current of finished) running.add(current);
    }
  };
  for (const group of groups) {
    await guarded(group);
    timers.push(
      setInterval(() => {
        void guarded(group);
      }, group.intervalMs),
    );
  }

  return {
    stop: () => timers.forEach((timer) => clearInterval(timer)),
    progress: () =>
      groups.flatMap(({ intervalMs, steps }) =>
        steps.map(({ job }) => ({
          job,
          intervalMs,
          lastSuccessAt: lastSuccessAt.get(job) ?? startedAt,
        })),
      ),
  };
};
