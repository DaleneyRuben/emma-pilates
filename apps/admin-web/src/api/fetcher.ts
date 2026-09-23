import { ApiError, normalizeProblem } from "./problem";

type AdminFetcherOptions = {
  /** Where relative `/api/v1` paths resolve; the page origin per ADR-0084. */
  origin?: string;
  fetch?: typeof globalThis.fetch;
  requestId?: () => string;
};

const problemMediaType = "application/problem+json";

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

/**
 * Wraps `fetch` for the generated `@pilates/api-contracts` client: requests
 * stay same-origin so the Vercel proxy and its host-only cookie apply, every
 * request carries a correlation id the backend echoes, and any non-2xx or
 * network failure surfaces as an `ApiError` so TanStack Query sees an error
 * instead of a successful envelope with an error status.
 */
export function createAdminFetcher({
  origin,
  fetch: fetchImplementation,
  requestId = () => crypto.randomUUID(),
}: AdminFetcherOptions = {}): typeof globalThis.fetch {
  return async (input, init) => {
    // Resolved per request so a fetch installed later (MSW, a polyfill)
    // is honored.
    const doFetch = fetchImplementation ?? globalThis.fetch;
    const headers = new Headers(init?.headers);
    headers.set("Accept", `application/json, ${problemMediaType}`);
    if (!headers.has("x-request-id")) {
      headers.set("x-request-id", requestId());
    }

    const path = typeof input === "string" ? input : input.toString();
    const url = new URL(path, origin ?? window.location.origin);

    let response: Response;
    try {
      response = await doFetch(url, {
        ...init,
        headers,
        credentials: "same-origin",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new ApiError(normalizeProblem({ status: 0, body: undefined }));
    }

    if (response.ok) {
      return response;
    }

    throw new ApiError(
      normalizeProblem({
        status: response.status,
        body: await parseBody(response),
        headers: response.headers,
      }),
    );
  };
}

export const adminFetch: typeof globalThis.fetch = (input, init) =>
  createAdminFetcher()(input, init);
