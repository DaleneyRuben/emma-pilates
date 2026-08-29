import { createApiFetcher } from "./fetcher";

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
});
