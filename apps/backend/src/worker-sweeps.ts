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
};

// Each group runs once at startup, then on its interval. A failed step is
// logged and reported, and the worker keeps running (EXT-002, EXT-011).
export const startSweeps = async (
  groups: SweepGroup[],
  dependencies: SweepDependencies,
): Promise<() => void> => {
  const runStep = (step: SweepStep) =>
    step.execute().then(
      () => undefined,
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
  for (const group of groups) {
    await runGroup(group);
    timers.push(
      setInterval(() => {
        void runGroup(group);
      }, group.intervalMs),
    );
  }

  return () => timers.forEach((timer) => clearInterval(timer));
};
