import { encodeBase64 } from "../encoding/base64";
import { imageSizeFromBytes } from "../images/image-size";

export type PdfPage = { aspectRatio: number; pageCount: number; uri: string };

/**
 * One page of a PDF invoice, drawn by the API as a PNG (ADR-0110), with the
 * page count from `X-Page-Count`. A failure throws, so the query retries.
 */
export async function loadPdfPage(fetcher: typeof globalThis.fetch, url: string): Promise<PdfPage> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error("invoice_page_unavailable");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const size = imageSizeFromBytes(bytes);
  const pageCount = Number(response.headers.get("X-Page-Count") ?? "1");
  return {
    // A sheet of paper when the header cannot be read: A4 portrait.
    aspectRatio: size === null || size.height === 0 ? 210 / 297 : size.width / size.height,
    pageCount: Number.isInteger(pageCount) && pageCount > 0 ? pageCount : 1,
    uri: `data:image/png;base64,${encodeBase64(bytes)}`,
  };
}
