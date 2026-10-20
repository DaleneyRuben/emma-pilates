import { runSmokeChecks } from './health/smoke-checks';

// Non-mutating post-deployment smoke check (ADR-0080):
// SMOKE_BASE_URL=https://api.example.com SMOKE_EXPECTED_RELEASE=<release> pnpm smoke
// Production adds SMOKE_API_DOCUMENTATION=hidden (BE-025).
async function main(): Promise<void> {
  const report = await runSmokeChecks({
    baseUrl: process.env.SMOKE_BASE_URL ?? 'http://localhost:3100',
    expectedRelease: process.env.SMOKE_EXPECTED_RELEASE,
    apiDocumentation:
      process.env.SMOKE_API_DOCUMENTATION === 'hidden' ? 'hidden' : 'served',
    fetch: (url, init) => fetch(url, init),
  });
  console.log(JSON.stringify(report));
  process.exitCode = report.passed ? 0 : 1;
}

void main();
