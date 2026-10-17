import { type ReleaseFetch } from './northflank-client';

const readinessTimeoutMs = 5_000;

// The commit an API's /health/ready reports, or null when it is not ready,
// cannot be reached, or reports none (EXT-017).
export async function readReportedRelease(
  fetch: ReleaseFetch,
  url: string,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {},
      signal: AbortSignal.timeout(readinessTimeoutMs),
    });
    if (!response.ok) {
      return null;
    }
    const body: unknown = await response.json();
    return typeof body === 'object' &&
      body !== null &&
      'release' in body &&
      typeof body.release === 'string'
      ? body.release
      : null;
  } catch {
    return null;
  }
}
