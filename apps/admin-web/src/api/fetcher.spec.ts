import { listAdminBranches } from "@pilates/api-contracts";
import { http, HttpResponse } from "msw";
import { createAdminFetcher } from "./fetcher";
import { isApiError } from "./problem";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";

const branches = [
  { id: "b1", name: "Centro", address: "Calle Libertad 123", archivedAt: null },
];

const rejection = async (work: Promise<unknown>): Promise<unknown> => {
  try {
    await work;
    return "resolved";
  } catch (error) {
    return error;
  }
};

describe("createAdminFetcher", () => {
  useMockServer();
  const adminFetch = createAdminFetcher();

  it("resolves the generated client's relative paths against the page origin and returns 2xx bodies", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/branches"), () =>
        jsonResponse(branches),
      ),
    );

    const response = await listAdminBranches(undefined, adminFetch);

    expect(response.status).toBe(200);
    expect(response.data).toEqual(branches);
  });

  it("sends same-origin credentials, accepts problem+json, and tags each request with a correlation id", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(apiUrl("/api/v1/administrator/branches"), ({ request }) => {
        seen = request;
        return jsonResponse(branches);
      }),
    );

    await listAdminBranches(undefined, adminFetch);

    expect(seen?.credentials).toBe("same-origin");
    expect(seen?.headers.get("accept")).toContain("application/problem+json");
    expect(seen?.headers.get("x-request-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("throws an ApiError carrying the stable code of a problem response", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/branches"), () =>
        problemResponse(403, "administration_access_denied", {
          detail: "Only Administrators may manage the catalog",
        }),
      ),
    );

    const error = await rejection(listAdminBranches(undefined, adminFetch));

    expect(isApiError(error)).toBe(true);
    if (!isApiError(error)) throw new Error("expected an ApiError");
    expect(error.problem).toEqual({
      status: 403,
      code: "administration_access_denied",
      title: "Problem",
      detail: "Only Administrators may manage the catalog",
    });
  });

  it("reads Retry-After from a throttled response", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/branches"), () =>
        problemResponse(429, "rate_limit_exceeded", {
          headers: { "Retry-After": "30" },
        }),
      ),
    );

    const error = await rejection(listAdminBranches(undefined, adminFetch));

    expect(isApiError(error) && error.problem.retryAfterSeconds).toBe(30);
  });

  it("collapses a non-problem failure body into unexpected_error with the response status", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/branches"), () =>
        HttpResponse.text("<html>Bad gateway</html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    const error = await rejection(listAdminBranches(undefined, adminFetch));

    expect(isApiError(error) && error.problem).toEqual({
      status: 502,
      code: "unexpected_error",
    });
  });

  it("reports a request that never reached the backend as network_error", async () => {
    server.use(
      http.get(apiUrl("/api/v1/administrator/branches"), () =>
        HttpResponse.error(),
      ),
    );

    const error = await rejection(listAdminBranches(undefined, adminFetch));

    expect(isApiError(error) && error.problem).toEqual({
      status: 0,
      code: "network_error",
    });
  });
});
