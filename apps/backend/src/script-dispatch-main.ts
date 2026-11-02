import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { createNorthflankClient } from './deployment/northflank-client';
import { dispatchScript } from './deployment/script-dispatch';

// REL-016: the Run Script workflow runs this. SCRIPT_ENVIRONMENT=staging|
// production NORTHFLANK_API_TOKEN=… NORTHFLANK_PROJECT_ID=default
// NORTHFLANK_JOB_ID=migrate SCRIPT_NAME=… [SCRIPT_PARAMS={"…":…}]
// [SCRIPT_DRY_RUN=true] [SCRIPT_FORCE_RERUN=true] pnpm script:dispatch
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function params(): Record<string, unknown> {
  const raw = process.env.SCRIPT_PARAMS?.trim() ?? '';
  if (raw === '') return {};
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('SCRIPT_PARAMS must be a JSON object, such as {"a": 1}');
  }
  return parsed as Record<string, unknown>;
}

function runUrl(): string | null {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  return GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : null;
}

async function main(): Promise<void> {
  const environment = required('SCRIPT_ENVIRONMENT');
  const scriptName = required('SCRIPT_NAME');
  const result = await dispatchScript({
    northflank: createNorthflankClient({
      token: required('NORTHFLANK_API_TOKEN'),
      projectId: required('NORTHFLANK_PROJECT_ID'),
      fetch: (url, init) => fetch(url, init),
    }),
    clock: { now: () => Date.now(), sleep: (ms) => sleep(ms) },
    jobId: required('NORTHFLANK_JOB_ID'),
    command: {
      scriptName,
      params: params(),
      dryRun: process.env.SCRIPT_DRY_RUN === 'true',
      forceRerun: process.env.SCRIPT_FORCE_RERUN === 'true',
      runUrl: runUrl(),
    },
    log: (line) => console.log(line),
  });
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      result.outcome === 'succeeded'
        ? `${scriptName} ran on ${environment} as ${result.runName}. Its output is in that job run's log in Northflank.\n`
        : `${scriptName} on ${environment} did not succeed: ${result.detail}\n`,
    );
  }
  process.exitCode = result.outcome === 'succeeded' ? 0 : 1;
}

void main();
