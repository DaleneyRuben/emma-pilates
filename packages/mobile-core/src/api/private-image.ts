import { encodeBase64 } from "../encoding/base64";
import { imageSizeFromBytes } from "../images/image-size";

// A private, authenticated image (a receipt, a profile photo) is fetched
// through the API fetcher and rendered inline as a data URI, since a React
// Native Image cannot carry the bearer credential itself.
export async function loadPrivateImage(
  fetcher: typeof globalThis.fetch,
  url: string,
): Promise<string | null> {
  const loaded = await loadPrivateImageWithRatio(fetcher, url);
  return loaded?.uri ?? null;
}

// Android does not measure a data URI, so a caller that must keep the
// image's own proportions (the studio QR, a receipt thumbnail) reads the
// ratio from the header. Unknown bytes answer 1, a square.
export async function loadPrivateImageWithRatio(
  fetcher: typeof globalThis.fetch,
  url: string,
): Promise<{ aspectRatio: number; uri: string } | null> {
  const response = await fetcher(url);
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = response.headers.get("Content-Type") ?? "image/jpeg";
  const size = imageSizeFromBytes(bytes);
  const aspectRatio = size === null || size.height === 0 ? 1 : size.width / size.height;
  return { aspectRatio, uri: `data:${type};base64,${encodeBase64(bytes)}` };
}
