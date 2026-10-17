// Stub until EXT-017's GitHub reads are implemented.
import { type ReleaseFetch } from './northflank-client';
import { type CommitComparison } from './promotion';

export class GitHubRequestError extends Error {}

export type GitHubClient = {
  commitStatus(sha: string, context: string): Promise<string | null>;
  compare(from: string, to: string): Promise<CommitComparison>;
};

export function createGitHubClient(input: {
  token: string;
  repository: string;
  fetch: ReleaseFetch;
}): GitHubClient {
  void input;
  return {
    commitStatus: () => Promise.reject(new GitHubRequestError('stub')),
    compare: () => Promise.reject(new GitHubRequestError('stub')),
  };
}
