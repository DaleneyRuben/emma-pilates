import { scriptRunnerCommand, type ScriptCommand } from './script-command';
import type { ReleaseClock } from './backend-release';
import {
  NorthflankRequestError,
  type NorthflankClient,
  type NorthflankRun,
} from './northflank-client';

export type DispatchResult =
  | { outcome: 'succeeded'; runName: string }
  | { outcome: 'failed'; runName: string; detail: string };

const runLimitMs = 30 * 60_000;
const pollIntervalMs = 10_000;
// Network failures in a row tolerated while waiting; HTTP errors are not.
const tolerableNetworkFailures = 3;

// REL-016: the Run Script workflow's side. The free allowance has no job
// left, so a script runs as a run of the migrate job (the image of the last
// release, with the production secret group) under the script runner's
// command; the job keeps its own command for the next release.
export const dispatchScript = async (input: {
  northflank: NorthflankClient;
  clock: ReleaseClock;
  jobId: string;
  command: ScriptCommand;
  log: (line: string) => void;
}): Promise<DispatchResult> => {
  const { northflank, clock, jobId } = input;
  // A release migrates through the same job; never run beside it.
  const busy = (await northflank.listJobRuns(jobId)).find(
    (run) => !run.concluded,
  );
  if (busy !== undefined) {
    return {
      outcome: 'failed',
      runName: busy.runName,
      detail: `${busy.runName} is still ${busy.status}; run the script again once it has ended`,
    };
  }
  const started = await northflank.startJobRun(jobId, {
    customCommand: scriptRunnerCommand(input.command),
  });
  const runName = started.runName;
  input.log(`${runName} started for ${input.command.scriptName}`);

  const deadline = clock.now() + runLimitMs;
  let failures = 0;
  let last: NorthflankRun | undefined;
  while (clock.now() < deadline) {
    try {
      last = await northflank.getJobRun(jobId, started.id);
      failures = 0;
    } catch (error) {
      failures += 1;
      if (
        error instanceof NorthflankRequestError ||
        failures > tolerableNetworkFailures
      ) {
        throw error;
      }
    }
    if (last?.concluded === true) {
      return last.status === 'SUCCESS'
        ? { outcome: 'succeeded', runName }
        : {
            outcome: 'failed',
            runName,
            detail: `${runName} ended ${last.status}; its log in Northflank says why`,
          };
    }
    await clock.sleep(pollIntervalMs);
  }
  return {
    outcome: 'failed',
    runName,
    detail: `${runName} is still ${last?.status ?? 'unknown'} after 30 minutes`,
  };
};
