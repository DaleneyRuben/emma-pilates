import { encodeBase64 } from "../encoding/base64";

// A private, authenticated image (a receipt, a profile photo) is fetched
// through the API fetcher and rendered inline as a data URI, since a React
// Native Image cannot carry the bearer credential itself.
export async function loadPrivateImage(
  fetcher: typeof globalThis.fetch,
  url: string,
): Promise<string | null> {
  const response = await fetcher(url);
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = response.headers.get("Content-Type") ?? "image/jpeg";
  return `data:${type};base64,${encodeBase64(bytes)}`;
}
