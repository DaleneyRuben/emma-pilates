import { createSessionApi } from "./session-api";

describe("createSessionApi", () => {
  it("resolves the current Account through the generated API client", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accountId: "account-1",
          identity: { kind: "client", clientId: "client-1" },
        }),
        { status: 200 },
      ),
    );
    const api = createSessionApi({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(api.resolveCurrent("credential")).resolves.toEqual({
      accountId: "account-1",
      identity: { kind: "client", clientId: "client-1" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/authentication-sessions/current",
      expect.objectContaining({ method: "GET" }),
    );
    expect(
      (fetchMock.mock.calls[0][1]?.headers as Headers).get("Authorization"),
    ).toBe("Bearer credential");
  });
});
