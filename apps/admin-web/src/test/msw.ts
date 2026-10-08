import { HttpResponse, type JsonBodyType } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer();

// WEB-018: a request no handler of the running test answers fails that test
// instead of only printing MSW's error. The listener is attached per test so
// a spec that clears the server's listeners cannot switch it off for the
// tests after it.
export function useMockServer(): void {
  const unhandled: string[] = [];
  const record = ({ request }: { request: Request }) => {
    unhandled.push(`${request.method} ${new URL(request.url).pathname}`);
  };

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  beforeEach(() => server.events.on("request:unhandled", record));
  afterEach(() => {
    server.events.removeListener("request:unhandled", record);
    server.resetHandlers();
    expect(unhandled.splice(0)).toEqual([]);
  });
  afterAll(() => server.close());
}

export const apiUrl = (path: string): string =>
  `${window.location.origin}${path}`;

export function jsonResponse(body: JsonBodyType, status = 200): Response {
  return HttpResponse.json(body, { status });
}

export function problemResponse(
  status: number,
  code: string,
  extra: { detail?: string; headers?: Record<string, string> } = {},
): Response {
  return HttpResponse.json(
    {
      type: "about:blank",
      title: "Problem",
      status,
      detail: extra.detail ?? "Problem detail",
      instance: "/api/v1/problem",
      code,
    },
    {
      status,
      headers: {
        "content-type": "application/problem+json",
        ...extra.headers,
      },
    },
  );
}
