import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./problem";
import { createAdminQueryClient, shouldRetryQuery } from "./query-client";

describe("shouldRetryQuery", () => {
  it("never retries a client-side problem the backend answered on purpose", () => {
    expect(
      shouldRetryQuery(
        0,
        new ApiError({ status: 404, code: "resource_not_found" }),
      ),
    ).toBe(false);
    expect(
      shouldRetryQuery(
        0,
        new ApiError({ status: 401, code: "authentication_required" }),
      ),
    ).toBe(false);
    expect(
      shouldRetryQuery(
        0,
        new ApiError({ status: 429, code: "rate_limit_exceeded" }),
      ),
    ).toBe(false);
  });

  it("retries a server failure or a network failure once", () => {
    expect(
      shouldRetryQuery(
        0,
        new ApiError({ status: 503, code: "unexpected_error" }),
      ),
    ).toBe(true);
    expect(
      shouldRetryQuery(0, new ApiError({ status: 0, code: "network_error" })),
    ).toBe(true);
    expect(
      shouldRetryQuery(
        1,
        new ApiError({ status: 503, code: "unexpected_error" }),
      ),
    ).toBe(false);
  });

  it("retries an unknown error shape once as well", () => {
    expect(shouldRetryQuery(0, new Error("boom"))).toBe(true);
    expect(shouldRetryQuery(1, new Error("boom"))).toBe(false);
  });
});

describe("createAdminQueryClient", () => {
  it("installs the retry policy and a short stale time without refetching on window focus", () => {
    const client = createAdminQueryClient();

    expect(client).toBeInstanceOf(QueryClient);
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.retry).toBe(shouldRetryQuery);
    expect(defaults?.staleTime).toBe(30_000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });
});
