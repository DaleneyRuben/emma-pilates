import { createGitHubClient, GitHubRequestError } from './github-client';
import { type ReleaseFetch } from './northflank-client';

type Call = { url: string; method: string; headers: Record<string, string> };

function fakeFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  const fetch: ReleaseFetch = (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers });
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  };
  return { calls, fetch };
}

const sha = 'd9ff2e02ec0db4d23d4bceb7eca59730f96f48e9';
const token = 'gh-secret-token-value';

function client(fetch: ReleaseFetch) {
  return createGitHubClient({
    token,
    repository: 'DaleneyRuben/emma-pilates',
    fetch,
  });
}

describe('createGitHubClient (EXT-017)', () => {
  it("reads the newest state of a commit's status context", async () => {
    const { calls, fetch } = fakeFetch(200, [
      { context: 'ci/other', state: 'failure' },
      { context: 'release/staging', state: 'success' },
      { context: 'release/staging', state: 'pending' },
    ]);

    await expect(
      client(fetch).commitStatus(sha, 'release/staging'),
    ).resolves.toBe('success');
    expect(calls).toEqual([
      {
        url: `https://api.github.com/repos/DaleneyRuben/emma-pilates/commits/${sha}/statuses?per_page=100`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    ]);
  });

  it('answers null when the commit has no status in that context', async () => {
    const { fetch } = fakeFetch(200, [
      { context: 'ci/other', state: 'success' },
    ]);

    await expect(
      client(fetch).commitStatus(sha, 'release/staging'),
    ).resolves.toBeNull();
  });

  it('compares two commits', async () => {
    const { calls, fetch } = fakeFetch(200, { status: 'behind' });

    await expect(client(fetch).compare('a'.repeat(40), sha)).resolves.toBe(
      'behind',
    );
    expect(calls[0].url).toBe(
      `https://api.github.com/repos/DaleneyRuben/emma-pilates/compare/${'a'.repeat(40)}...${sha}`,
    );
  });

  it('fails on an unknown comparison', async () => {
    const { fetch } = fakeFetch(200, { status: 'sideways' });

    await expect(client(fetch).compare('a'.repeat(40), sha)).rejects.toThrow(
      new GitHubRequestError(
        `GitHub answered an unknown comparison sideways for GET /repos/DaleneyRuben/emma-pilates/compare/${'a'.repeat(40)}...${sha}`,
      ),
    );
  });

  it('fails with the status and path, never the token', async () => {
    const { fetch } = fakeFetch(404, { message: 'Not Found' });

    const failure = client(fetch).commitStatus(sha, 'release/staging');

    await expect(failure).rejects.toThrow(
      new GitHubRequestError(
        `GitHub answered 404 to GET /repos/DaleneyRuben/emma-pilates/commits/${sha}/statuses?per_page=100`,
      ),
    );
    await expect(failure).rejects.not.toThrow(token);
  });
});
