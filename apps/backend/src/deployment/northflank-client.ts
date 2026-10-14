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

export type NorthflankClient = {
  startJobBuild(jobId: string, sha: string): Promise<NorthflankBuild>;
  getJobBuild(jobId: string, buildId: string): Promise<NorthflankBuild>;
  startJobRun(jobId: string): Promise<{ id: string; runName: string }>;
  getJobRun(jobId: string, runId: string): Promise<NorthflankRun>;
  startServiceBuild(serviceId: string, sha: string): Promise<NorthflankBuild>;
  getServiceBuild(serviceId: string, buildId: string): Promise<NorthflankBuild>;
};

export class NorthflankRequestError extends Error {}

export function createNorthflankClient(input: {
  token: string;
  projectId: string;
  fetch: ReleaseFetch;
}): NorthflankClient {
  throw new Error(`not implemented for ${input.projectId}`);
}
