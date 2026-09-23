import { HttpResponse, type JsonBodyType } from "msw";
import { setupServer } from "msw/node";

export const server = setupServer();

export function useMockServer(): void {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

export const apiUrl = (path: string): string =>
  `${window.location.origin}${path}`;

export function jsonResponse(body: JsonBodyType, status = 200): HttpResponse {
  return HttpResponse.json(body, { status });
}

export function problemResponse(
  status: number,
  code: string,
  extra: { detail?: string; headers?: Record<string, string> } = {},
): HttpResponse {
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
