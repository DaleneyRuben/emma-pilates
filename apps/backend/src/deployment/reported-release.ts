// Stub until EXT-017's readiness read is implemented.
import { type ReleaseFetch } from './northflank-client';

export function readReportedRelease(
  fetch: ReleaseFetch,
  url: string,
): Promise<string | null> {
  void fetch;
  void url;
  return Promise.resolve('stub');
}
