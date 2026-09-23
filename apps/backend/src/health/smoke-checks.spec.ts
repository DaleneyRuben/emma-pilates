import { runSmokeChecks } from './smoke-checks';

type Reply = { status: number; body: unknown; contentType?: string };

function fakeFetch(replies: Record<string, Reply>) {
  const calls: { url: string; method: string }[] = [];
  const fetch = (input: string, init?: { method?: string }) => {
    calls.push({ url: input, method: init?.method ?? 'GET' });
    const reply = replies[new URL(input).pathname];
    if (reply === undefined) {
      return Promise.reject(new Error('connect ECONNREFUSED'));
    }
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'content-type': reply.contentType ?? 'application/json' },
      }),
    );
  };
  return { calls, fetch };
}

const healthyReplies: Record<string, Reply> = {
  '/health/live': { status: 200, body: { status: 'ok' } },
  '/health/ready': {
    status: 200,
    body: { status: 'ready', release: 'release-42' },
  },
  '/openapi.json': {
    status: 200,
    body: { openapi: '3.0.0', info: { title: 'Emma Pilates API' } },
  },
  '/api/v1/clients/current/subscription': {
    status: 401,
    body: { status: 401, code: 'authentication_required' },
    contentType: 'application/problem+json',
  },
};

describe('runSmokeChecks', () => {
  it('passes a healthy API serving the expected release using reads only', async () => {
    const { calls, fetch } = fakeFetch(healthyReplies);

    const report = await runSmokeChecks({
      baseUrl: 'https://api.example.com',
      expectedRelease: 'release-42',
      fetch,
    });

    expect(report.passed).toBe(true);
    expect(report.checks.map((check) => check.name)).toEqual([
      'liveness',
      'readiness',
      'openapi',
      'anonymous_access_rejected',
    ]);
    expect(calls.every((call) => call.method === 'GET')).toBe(true);
  });

  it('fails when a different release is serving', async () => {
    const { fetch } = fakeFetch(healthyReplies);

    const report = await runSmokeChecks({
      baseUrl: 'https://api.example.com',
      expectedRelease: 'release-43',
      fetch,
    });

    expect(report.passed).toBe(false);
    expect(report.checks.find((check) => check.name === 'readiness')).toEqual({
      name: 'readiness',
      passed: false,
      detail: 'serving release release-42, expected release-43',
    });
  });

  it('fails when a protected route answers without authentication', async () => {
    const { fetch } = fakeFetch({
      ...healthyReplies,
      '/api/v1/clients/current/subscription': { status: 200, body: {} },
    });

    const report = await runSmokeChecks({
      baseUrl: 'https://api.example.com',
      fetch,
    });

    expect(report.passed).toBe(false);
    expect(
      report.checks.find((check) => check.name === 'anonymous_access_rejected'),
    ).toMatchObject({ passed: false });
  });

  it('reports an unreachable API as failed checks instead of throwing', async () => {
    const { fetch } = fakeFetch({});

    const report = await runSmokeChecks({
      baseUrl: 'https://api.example.com',
      fetch,
    });

    expect(report.passed).toBe(false);
    expect(report.checks[0]).toEqual({
      name: 'liveness',
      passed: false,
      detail: 'request failed: connect ECONNREFUSED',
    });
  });
});
