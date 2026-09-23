import { ApiError, isApiError, normalizeProblem } from "./problem";

describe("normalizeProblem", () => {
  it("keeps the stable code, status, title, and detail of an RFC 9457 problem", () => {
    expect(
      normalizeProblem({
        status: 409,
        body: {
          type: "about:blank",
          title: "Conflict",
          status: 409,
          detail: "Idempotency Key was reused with a different request",
          instance: "/api/v1/administrator/supplies/1/withdrawals",
          code: "idempotency_key_reused",
        },
      }),
    ).toEqual({
      status: 409,
      code: "idempotency_key_reused",
      title: "Conflict",
      detail: "Idempotency Key was reused with a different request",
    });
  });

  it("falls back to unexpected_error when the body carries no stable code", () => {
    expect(
      normalizeProblem({ status: 502, body: "<html>Bad gateway</html>" }),
    ).toEqual({
      status: 502,
      code: "unexpected_error",
    });
    expect(normalizeProblem({ status: 500, body: null })).toEqual({
      status: 500,
      code: "unexpected_error",
    });
    expect(normalizeProblem({ status: 500, body: { code: 42 } })).toEqual({
      status: 500,
      code: "unexpected_error",
    });
  });

  it("uses the response status even when the body claims another one", () => {
    expect(
      normalizeProblem({
        status: 404,
        body: { status: 200, code: "resource_not_found" },
      }),
    ).toMatchObject({ status: 404, code: "resource_not_found" });
  });

  it("reads a Retry-After header in seconds and ignores an unusable one", () => {
    expect(
      normalizeProblem({
        status: 429,
        body: { code: "login_throttled" },
        headers: new Headers({ "Retry-After": "30" }),
      }),
    ).toEqual({ status: 429, code: "login_throttled", retryAfterSeconds: 30 });
    expect(
      normalizeProblem({
        status: 429,
        body: { code: "login_throttled" },
        headers: new Headers({
          "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT",
        }),
      }),
    ).toEqual({ status: 429, code: "login_throttled" });
  });

  it("reports a network failure as status 0", () => {
    expect(normalizeProblem({ status: 0, body: undefined })).toEqual({
      status: 0,
      code: "network_error",
    });
  });
});

describe("ApiError", () => {
  it("carries the normalized problem and is recognizable from unknown errors", () => {
    const error = new ApiError({
      status: 403,
      code: "administration_access_denied",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(403);
    expect(error.code).toBe("administration_access_denied");
    expect(error.message).toBe("administration_access_denied (403)");
    expect(isApiError(error)).toBe(true);
    expect(isApiError(new Error("plain"))).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});
