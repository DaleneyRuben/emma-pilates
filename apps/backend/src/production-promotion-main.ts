import { appendFileSync } from 'node:fs';
import { createGitHubClient } from './deployment/github-client';
import { type ReleaseFetch } from './deployment/northflank-client';
import { choosePromotion } from './deployment/promotion';
import { readReportedRelease } from './deployment/reported-release';

// EXT-017 (ADR-0092): the release-production workflow runs this before it
// releases anything. GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/name
// STAGING_API_URL=https://… PRODUCTION_API_URL=https://…
// [PROMOTE_SHA=<commit>] pnpm promotion
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} must be set`);
  }
  return value;
}

async function main(): Promise<void> {
  const fetch: ReleaseFetch = (url, init) => globalThis.fetch(url, init);
  const github = createGitHubClient({
    token: required('GITHUB_TOKEN'),
    repository: required('GITHUB_REPOSITORY'),
    fetch,
  });
  const readiness = (name: string) =>
    new URL('/health/ready', required(name)).href;
  const promotion = await choosePromotion(process.env.PROMOTE_SHA || null, {
    stagingRelease: () =>
      readReportedRelease(fetch, readiness('STAGING_API_URL')),
    productionRelease: () =>
      readReportedRelease(fetch, readiness('PRODUCTION_API_URL')),
    stagingCheck: (sha) => github.commitStatus(sha, 'release/staging'),
    compare: (from, to) => github.compare(from, to),
  });
  console.log(JSON.stringify(promotion));
  if (process.env.GITHUB_OUTPUT && promotion.outcome === 'promote') {
    appendFileSync(process.env.GITHUB_OUTPUT, `sha=${promotion.sha}\n`);
  }
  if (promotion.outcome === 'refused') {
    console.log(`::error::${promotion.detail}`);
    process.exitCode = 1;
  }
}

void main();
