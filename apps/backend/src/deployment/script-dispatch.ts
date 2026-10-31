import type { ScriptCommand } from '../script-runner/script-command';
import type { ReleaseClock } from './backend-release';
import type { NorthflankClient } from './northflank-client';

export type DispatchResult =
  | { outcome: 'succeeded'; runName: string }
  | { outcome: 'failed'; runName: string; detail: string };

export const dispatchScript = (input: {
  northflank: NorthflankClient;
  clock: ReleaseClock;
  jobId: string;
  command: ScriptCommand;
  log: (line: string) => void;
}): Promise<DispatchResult> =>
  Promise.reject(new Error(`not implemented ${input.jobId}`));
