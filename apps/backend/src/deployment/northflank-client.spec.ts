import {
  createNorthflankClient,
  NorthflankRequestError,
  type ReleaseFetch,
} from './northflank-client';

type Call = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  hasSignal: boolean;
};

function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fetch: ReleaseFetch = (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body === undefined ? undefined : JSON.parse(init.body),
      hasSignal: init.signal instanceof AbortSignal,
    });
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
  return { calls, fetch };
}

const sha = 'd9ff2e02ec0db4d23d4bceb7eca59730f96f48e9';
const token = 'nf-secret-token-value';

function client(fetch: ReleaseFetch) {
  return createNorthflankClient({ token, projectId: 'default', fetch });
}

const pendingBuild = {
  id: 'waiting-tank-238',
  sha,
  status: 'PENDING',
  concluded: false,
};

describe('createNorthflankClient', () => {
  it('starts a job build of the exact commit with the bearer token', async () => {
    const { calls, fetch } = fakeFetch(200, { data: pendingBuild });

    const build = await client(fetch).startJobBuild('migrate', sha);

    expect(calls).toEqual([
      {
        url: 'https://api.northflank.com/v1/projects/default/jobs/migrate/build',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: { sha },
        hasSignal: true,
      },
    ]);
    expect(build).toEqual({
      id: 'waiting-tank-238',
      status: 'PENDING',
      concluded: false,
      success: false,
      message: null,
    });
  });

  it('reads a job build by id', async () => {
    const { calls, fetch } = fakeFetch(200, {
      data: {
        ...pendingBuild,
        status: 'FAILURE',
        concluded: true,
        success: false,
        message: 'Dockerfile step 7 failed',
      },
    });

    const build = await client(fetch).getJobBuild(
      'migrate',
      'waiting-tank-238',
    );

    expect(calls[0]).toMatchObject({
      url: 'https://api.northflank.com/v1/projects/default/jobs/migrate/build/waiting-tank-238',
      method: 'GET',
      body: undefined,
    });
    expect(build).toEqual({
      id: 'waiting-tank-238',
      status: 'FAILURE',
      concluded: true,
      success: false,
      message: 'Dockerfile step 7 failed',
    });
  });

  it('starts a job run without overrides', async () => {
    const { calls, fetch } = fakeFetch(200, {
      data: { id: 'run-1', runName: 'migrate-1' },
    });

    const run = await client(fetch).startJobRun('migrate');

    expect(calls[0]).toMatchObject({
      url: 'https://api.northflank.com/v1/projects/default/jobs/migrate/runs',
      method: 'POST',
      body: {},
    });
    expect(run).toEqual({ id: 'run-1', runName: 'migrate-1' });
  });

  // REL-016: the Run Script workflow reuses the migrate job with its own
  // command, since the free allowance has no job left.
  it('starts a job run with another command for that run only', async () => {
    const { calls, fetch } = fakeFetch(200, {
      data: { id: 'run-2', runName: 'migrate-2' },
    });

    const run = await client(fetch).startJobRun('migrate', {
      customCommand: 'node dist/src/script-runner-main.js demo',
    });

    expect(calls[0]).toMatchObject({
      url: 'https://api.northflank.com/v1/projects/default/jobs/migrate/runs',
      method: 'POST',
      body: {
        deployment: {
          docker: {
            configType: 'customCommand',
            customCommand: 'node dist/src/script-runner-main.js demo',
          },
        },
      },
    });
    expect(run).toEqual({ id: 'run-2', runName: 'migrate-2' });
  });

  it('lists the newest runs of a job', async () => {
    const { calls, fetch } = fakeFetch(200, {
      data: {
        runs: [
          {
            id: 'run-3',
            runName: 'migrate-3',
            status: 'RUNNING',
            concluded: false,
          },
          {
            id: 'run-2',
            runName: 'migrate-2',
            status: 'SUCCESS',
            concluded: true,
          },
        ],
      },
    });

    const runs = await client(fetch).listJobRuns('migrate');

    expect(calls[0]).toMatchObject({
      url: 'https://api.northflank.com/v1/projects/default/jobs/migrate/runs?per_page=10',
      method: 'GET',
    });
    expect(runs).toEqual([
      {
        id: 'run-3',
        runName: 'migrate-3',
        status: 'RUNNING',
        concluded: false,
      },
      { id: 'run-2', runName: 'migrate-2', status: 'SUCCESS', concluded: true },
    ]);
  });

  it('reads a job run by id', async () => {
    const { calls, fetch } = fakeFetch(200, {
      data: {
        id: 'run-1',
        runName: 'migrate-1',
        status: 'SUCCESS',
        concluded: true,
      },
    });

    const run = await client(fetch).getJobRun('migrate', 'run-1');

    expect(calls[0]).toMatchObject({
      url: 'https://api.northflank.com/v1/projects/default/jobs/migrate/runs/run-1',
      method: 'GET',
    });
    expect(run).toEqual({
      id: 'run-1',
      runName: 'migrate-1',
      status: 'SUCCESS',
      concluded: true,
    });
  });

  it('starts and reads a service build of the exact commit', async () => {
    const { calls, fetch } = fakeFetch(200, {
      data: { ...pendingBuild, id: 'adept-canvas-2539' },
    });
    const northflank = client(fetch);

    await northflank.startServiceBuild('api', sha);
    await northflank.getServiceBuild('api', 'adept-canvas-2539');

    expect(
      calls.map(({ url, method, body }) => ({ url, method, body })),
    ).toEqual([
      {
        url: 'https://api.northflank.com/v1/projects/default/services/api/build',
        method: 'POST',
        body: { sha },
      },
      {
        url: 'https://api.northflank.com/v1/projects/default/services/api/build/adept-canvas-2539',
        method: 'GET',
        body: undefined,
      },
    ]);
  });

  it('reports an HTTP error with its status and path but never the token', async () => {
    const { fetch } = fakeFetch(403, {
      error: { status: 403, message: 'Insufficient permissions' },
    });

    const failure = await client(fetch)
      .startJobBuild('migrate', sha)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NorthflankRequestError);
    const { message } = failure as NorthflankRequestError;
    expect(message).toBe(
      'Northflank answered 403 to POST /v1/projects/default/jobs/migrate/build: Insufficient permissions',
    );
    expect(message).not.toContain(token);
  });

  it('reports a response without data as a request error', async () => {
    const { fetch } = fakeFetch(200, { unexpected: true });

    await expect(client(fetch).getJobRun('migrate', 'run-1')).rejects.toThrow(
      new NorthflankRequestError(
        'Northflank answered 200 to GET /v1/projects/default/jobs/migrate/runs/run-1 without data',
      ),
    );
  });

  it("reads a service's rollout status and when it last changed", async () => {
    const { calls, fetch } = fakeFetch(200, {
      data: {
        id: 'worker',
        status: {
          build: { status: 'SUCCESS' },
          deployment: {
            status: 'COMPLETED',
            reason: 'DEPLOYING',
            lastTransitionTime: '2026-10-14T03:00:00.000Z',
          },
        },
      },
    });

    const deployment = await client(fetch).getServiceDeployment('worker');

    expect(calls[0]).toMatchObject({
      url: 'https://api.northflank.com/v1/projects/default/services/worker',
      method: 'GET',
    });
    expect(deployment).toEqual({
      status: 'COMPLETED',
      transitionedAt: Date.parse('2026-10-14T03:00:00.000Z'),
    });
  });

  it('reads a service that has not rolled out yet', async () => {
    const { fetch } = fakeFetch(200, { data: { id: 'worker', status: {} } });

    await expect(client(fetch).getServiceDeployment('worker')).resolves.toEqual(
      { status: 'UNKNOWN', transitionedAt: null },
    );
  });
});
