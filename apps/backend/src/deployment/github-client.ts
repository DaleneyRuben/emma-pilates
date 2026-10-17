import { type ReleaseFetch } from './northflank-client';
import { type CommitComparison } from './promotion';

// Carries the HTTP status and path only; the token never reaches a message.
export class GitHubRequestError extends Error {}

export type GitHubClient = {
  commitStatus(sha: string, context: string): Promise<string | null>;
  compare(from: string, to: string): Promise<CommitComparison>;
};

const apiUrl = 'https://api.github.com';
const requestTimeoutMs = 15_000;
const comparisons: readonly string[] = [
  'ahead',
  'behind',
  'identical',
  'diverged',
];

function isComparison(value: unknown): value is CommitComparison {
  return typeof value === 'string' && comparisons.includes(value);
}

// The two GitHub REST reads a production promotion makes (EXT-017).
export function createGitHubClient(input: {
  token: string;
  repository: string;
  fetch: ReleaseFetch;
}): GitHubClient {
  const repository = `/repos/${input.repository}`;

  async function get(path: string): Promise<unknown> {
    const response = await input.fetch(`${apiUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!response.ok) {
      throw new GitHubRequestError(
        `GitHub answered ${response.status} to GET ${path}`,
      );
    }
    return response.json();
  }

  return {
    // GitHub lists a commit's statuses newest first.
    commitStatus: async (sha, context) => {
      const statuses = await get(
        `${repository}/commits/${sha}/statuses?per_page=100`,
      );
      const newest = Array.isArray(statuses)
        ? (statuses as unknown[]).find(
            (status): status is { state: unknown } =>
              typeof status === 'object' &&
              status !== null &&
              'context' in status &&
              status.context === context &&
              'state' in status,
          )
        : undefined;
      return typeof newest?.state === 'string' ? newest.state : null;
    },
    compare: async (from, to) => {
      const path = `${repository}/compare/${from}...${to}`;
      const body = await get(path);
      const status =
        typeof body === 'object' && body !== null && 'status' in body
          ? body.status
          : undefined;
      if (!isComparison(status)) {
        throw new GitHubRequestError(
          `GitHub answered an unknown comparison ${String(status)} for GET ${path}`,
        );
      }
      return status;
    },
  };
}
