import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { createNorthflankClient } from './deployment/northflank-client';
import {
  releaseBackend,
  type ReleaseResult,
} from './deployment/backend-release';

// EXT-008, EXT-017: the release workflows run this for staging and production.
// RELEASE_ENVIRONMENT=staging|production NORTHFLANK_API_TOKEN=…
// RELEASE_SHA=<commit> MAIN_HEAD=<main's head>
// NORTHFLANK_PROJECT_ID=default NORTHFLANK_JOB_ID=migrate
// NORTHFLANK_SERVICE_ID=api [NORTHFLANK_WORKER_SERVICE_ID=worker]
// [NORTHFLANK_BACKUP_JOB_ID=backup] API_URL=https://… pnpm release
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function summary(
  environment: string,
  sha: string,
  result: ReleaseResult,
): string {
  switch (result.outcome) {
    case 'released':
      return `${environment} released ${sha}.`;
    case 'superseded':
      return `Skipped ${sha}: ${result.detail}.`;
    case 'failed':
      return `Release of ${sha} failed at ${result.stage}: ${result.detail}`;
  }
}

async function main(): Promise<void> {
  const environment = required('RELEASE_ENVIRONMENT');
  const sha = required('RELEASE_SHA');
  const northflank = createNorthflankClient({
    token: required('NORTHFLANK_API_TOKEN'),
    projectId: required('NORTHFLANK_PROJECT_ID'),
    fetch: (url, init) => fetch(url, init),
  });
  const result = await releaseBackend({
    sha,
    mainHead: required('MAIN_HEAD'),
    jobId: required('NORTHFLANK_JOB_ID'),
    serviceId: required('NORTHFLANK_SERVICE_ID'),
    // Empty until Northflank's worker service exists (EXT-002).
    workerServiceId: process.env.NORTHFLANK_WORKER_SERVICE_ID || null,
    // Empty until Northflank's backup job exists (EXT-009).
    backupJobId: process.env.NORTHFLANK_BACKUP_JOB_ID || null,
    readinessUrl: new URL('/health/ready', required('API_URL')).href,
    northflank,
    fetch: (url, init) => fetch(url, init),
    clock: { now: () => Date.now(), sleep: (ms) => sleep(ms) },
    log: (line) => console.log(line),
  });
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `outcome=${result.outcome}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${summary(environment, sha, result)}\n`,
    );
  }
  process.exitCode = result.outcome === 'failed' ? 1 : 0;
}

void main();
