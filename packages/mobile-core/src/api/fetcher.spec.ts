import { createApiFetcher, resolveApiUrl } from "./fetcher";

describe("createApiFetcher", () => {
  it("adds the API base URL and bearer credential to generated-client requests", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response("{}"));
    const fetcher = createApiFetcher({
      baseUrl: "https://api.example.com/api/v1",
      getCredential: async () => "credential",
      fetch: fetchMock,
    });

    await fetcher("/health/live", { method: "GET" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/health/live",
      expect.objectContaining({ method: "GET" }),
    );
    expect(
      (fetchMock.mock.calls[0][1]?.headers as Headers).get("Authorization"),
    ).toBe("Bearer credential");
  });

  it("does not duplicate the API version from a generated request path", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response("{}"));
    const fetcher = createApiFetcher({
      baseUrl: "https://api.example.com/api/v1",
      getCredential: async () => null,
      fetch: fetchMock,
    });

    await fetcher("/api/v1/authentication-sessions/current");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/authentication-sessions/current",
      expect.any(Object),
    );
  });
});

describe("resolveApiUrl", () => {
  it("resolves a generated request path against the API origin", () => {
    expect(
      resolveApiUrl(
        "https://api.example.com/api/v1",
        "/api/v1/promotion-images/asset/promotion_960/version",
      ),
    ).toBe("https://api.example.com/api/v1/promotion-images/asset/promotion_960/version");
    expect(resolveApiUrl("https://api.example.com/api/v1", "/health/live")).toBe(
      "https://api.example.com/api/v1/health/live",
    );
  });

  it("leaves an absolute URL untouched so a public R2 origin passes through", () => {
    expect(
      resolveApiUrl(
        "https://api.example.com/api/v1",
        "https://images.example.com/public/promotion/asset/promotion_960-version",
      ),
    ).toBe("https://images.example.com/public/promotion/asset/promotion_960-version");
  });
});
