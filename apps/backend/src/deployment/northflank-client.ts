export type ReleaseFetch = (
  url: string,
  init: {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
    signal: AbortSignal;
  },
) => Promise<Response>;

export type NorthflankBuild = {
  id: string;
  status: string;
  concluded: boolean;
  success: boolean;
  message: string | null;
};

export type NorthflankRun = {
  id: string;
  runName: string;
  status: string;
  concluded: boolean;
};

// A service's rollout as Northflank reports it; combined services carry no
// deployed commit, so the release compares the transition time instead.
export type NorthflankDeployment = {
  status: string;
  transitionedAt: number | null;
};

export type NorthflankClient = {
  startJobBuild(jobId: string, sha: string): Promise<NorthflankBuild>;
  getJobBuild(jobId: string, buildId: string): Promise<NorthflankBuild>;
  startJobRun(
    jobId: string,
    override?: { customCommand: string },
  ): Promise<{ id: string; runName: string }>;
  getJobRun(jobId: string, runId: string): Promise<NorthflankRun>;
  startServiceBuild(serviceId: string, sha: string): Promise<NorthflankBuild>;
  getServiceBuild(serviceId: string, buildId: string): Promise<NorthflankBuild>;
  getServiceDeployment(serviceId: string): Promise<NorthflankDeployment>;
};

// Carries the HTTP status and path only; the token never reaches a message.
export class NorthflankRequestError extends Error {}

const apiUrl = 'https://api.northflank.com';
const requestTimeoutMs = 15_000;

type Method = 'GET' | 'POST';

function errorMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return undefined;
  }
  const { error } = body;
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : undefined;
}

function toBuild(data: Record<string, unknown>): NorthflankBuild {
  return {
    id: String(data.id),
    status: String(data.status),
    concluded: data.concluded === true,
    success: data.success === true,
    message: typeof data.message === 'string' ? data.message : null,
  };
}

function toDeployment(data: Record<string, unknown>): NorthflankDeployment {
  const status =
    typeof data.status === 'object' && data.status !== null
      ? (data.status as Record<string, unknown>)
      : {};
  const deployment =
    typeof status.deployment === 'object' && status.deployment !== null
      ? (status.deployment as Record<string, unknown>)
      : {};
  const transition =
    typeof deployment.lastTransitionTime === 'string'
      ? Date.parse(deployment.lastTransitionTime)
      : Number.NaN;
  return {
    status:
      typeof deployment.status === 'string' ? deployment.status : 'UNKNOWN',
    transitionedAt: Number.isNaN(transition) ? null : transition,
  };
}

function toRun(data: Record<string, unknown>): NorthflankRun {
  return {
    id: String(data.id),
    runName: String(data.runName),
    status: String(data.status),
    concluded: data.concluded === true,
  };
}

// The few Northflank API calls a production release makes
// (https://northflank.com/docs/v1/api).
export function createNorthflankClient(input: {
  token: string;
  projectId: string;
  fetch: ReleaseFetch;
}): NorthflankClient {
  const project = `/v1/projects/${input.projectId}`;

  async function request(
    method: Method,
    path: string,
    body?: object,
  ): Promise<Record<string, unknown>> {
    const response = await input.fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    const payload: unknown = await response.json().catch(() => null);
    const answered = `Northflank answered ${response.status} to ${method} ${path}`;
    if (!response.ok) {
      const reason = errorMessage(payload);
      throw new NorthflankRequestError(
        reason === undefined ? answered : `${answered}: ${reason}`,
      );
    }
    const data =
      typeof payload === 'object' && payload !== null && 'data' in payload
        ? payload.data
        : undefined;
    if (typeof data !== 'object' || data === null) {
      throw new NorthflankRequestError(`${answered} without data`);
    }
    return data as Record<string, unknown>;
  }

  return {
    startJobBuild: async (jobId, sha) =>
      toBuild(await request('POST', `${project}/jobs/${jobId}/build`, { sha })),
    getJobBuild: async (jobId, buildId) =>
      toBuild(
        await request('GET', `${project}/jobs/${jobId}/build/${buildId}`),
      ),
    startJobRun: async (jobId, override) => {
      const data = await request(
        'POST',
        `${project}/jobs/${jobId}/runs`,
        override === undefined
          ? {}
          : {
              deployment: {
                docker: {
                  configType: 'customCommand',
                  customCommand: override.customCommand,
                },
              },
            },
      );
      return { id: String(data.id), runName: String(data.runName) };
    },
    getJobRun: async (jobId, runId) =>
      toRun(await request('GET', `${project}/jobs/${jobId}/runs/${runId}`)),
    startServiceBuild: async (serviceId, sha) =>
      toBuild(
        await request('POST', `${project}/services/${serviceId}/build`, {
          sha,
        }),
      ),
    getServiceBuild: async (serviceId, buildId) =>
      toBuild(
        await request(
          'GET',
          `${project}/services/${serviceId}/build/${buildId}`,
        ),
      ),
    getServiceDeployment: async (serviceId) =>
      toDeployment(await request('GET', `${project}/services/${serviceId}`)),
  };
}
