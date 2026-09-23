export type SmokeFetch = (
  url: string,
  init?: { method?: 'GET'; signal?: AbortSignal },
) => Promise<Response>;

export type SmokeCheck = { name: string; passed: boolean; detail?: string };

export type SmokeReport = { passed: boolean; checks: SmokeCheck[] };

type Probe = {
  name: string;
  path: string;
  verify: (response: Response, body: unknown) => string | null;
};

const requestTimeoutMs = 5_000;

function field(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

// ADR-0080: post-deployment checks only read. They never run a synthetic
// Booking, Payment, or any other business command.
function probes(expectedRelease: string | undefined): Probe[] {
  return [
    {
      name: 'liveness',
      path: '/health/live',
      verify: (response, body) =>
        response.status === 200 && field(body, 'status') === 'ok'
          ? null
          : `answered ${response.status}`,
    },
    {
      name: 'readiness',
      path: '/health/ready',
      verify: (response, body) => {
        if (response.status !== 200 || field(body, 'status') !== 'ready') {
          return `answered ${response.status}`;
        }
        const release = field(body, 'release');
        return expectedRelease === undefined || release === expectedRelease
          ? null
          : `serving release ${String(release)}, expected ${expectedRelease}`;
      },
    },
    {
      name: 'openapi',
      path: '/openapi.json',
      verify: (response, body) =>
        response.status === 200 &&
        field(field(body, 'info'), 'title') === 'Emma Pilates API'
          ? null
          : `answered ${response.status}`,
    },
    {
      name: 'anonymous_access_rejected',
      path: '/api/v1/clients/current/subscription',
      verify: (response) =>
        response.status === 401 &&
        (response.headers.get('content-type') ?? '').includes(
          'application/problem+json',
        )
          ? null
          : `answered ${response.status} without authentication`,
    },
  ];
}

export async function runSmokeChecks(input: {
  baseUrl: string;
  expectedRelease?: string;
  fetch: SmokeFetch;
}): Promise<SmokeReport> {
  const checks: SmokeCheck[] = [];
  for (const probe of probes(input.expectedRelease)) {
    try {
      const response = await input.fetch(
        new URL(probe.path, input.baseUrl).href,
        {
          method: 'GET',
          signal: AbortSignal.timeout(requestTimeoutMs),
        },
      );
      const body: unknown = await response.json().catch(() => null);
      const failure = probe.verify(response, body);
      checks.push(
        failure === null
          ? { name: probe.name, passed: true }
          : { name: probe.name, passed: false, detail: failure },
      );
    } catch (error) {
      checks.push({
        name: probe.name,
        passed: false,
        detail: `request failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return { passed: checks.every((check) => check.passed), checks };
}
