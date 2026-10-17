import { type ReleaseFetch } from './northflank-client';
import { readReportedRelease } from './reported-release';

const sha = 'd9ff2e02ec0db4d23d4bceb7eca59730f96f48e9';
const url = 'https://api.example.com/health/ready';

function answering(reply: Response | Error) {
  const urls: string[] = [];
  const fetch: ReleaseFetch = (requested) => {
    urls.push(requested);
    return reply instanceof Error
      ? Promise.reject(reply)
      : Promise.resolve(reply);
  };
  return { urls, fetch };
}

describe('readReportedRelease (EXT-017)', () => {
  it('answers the commit a ready API reports', async () => {
    const { urls, fetch } = answering(
      new Response(JSON.stringify({ status: 'ready', release: sha })),
    );

    await expect(readReportedRelease(fetch, url)).resolves.toBe(sha);
    expect(urls).toEqual([url]);
  });

  it('answers null when the API is not ready', async () => {
    const { fetch } = answering(
      new Response(JSON.stringify({ status: 'not_ready' }), { status: 503 }),
    );

    await expect(readReportedRelease(fetch, url)).resolves.toBeNull();
  });

  it('answers null when the API cannot be reached', async () => {
    const { fetch } = answering(new TypeError('fetch failed'));

    await expect(readReportedRelease(fetch, url)).resolves.toBeNull();
  });
});
