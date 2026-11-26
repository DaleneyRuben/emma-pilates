import { createAuthenticationApi, verificationTimeoutMilliseconds } from "./authentication-api";

// Walkthrough n.º 3: a stalled network left «Verificando correo» up for ever.
describe("createAuthenticationApi email verification timeout", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("aborts an email verification the server never answers", async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const fetchMock = jest.fn((_input: unknown, init?: RequestInit) => {
      signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted) reject(new Error("aborted"));
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });
    const api = createAuthenticationApi({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    const verification = api.verifyClientEmail("verification-token");
    const settled = expect(verification).rejects.toThrow();
    await jest.advanceTimersByTimeAsync(verificationTimeoutMilliseconds);

    await settled;
    expect(signal?.aborted).toBe(true);
  });

  it("clears the timer once the server answers", async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: "verified" }), { status: 200 }));
    const api = createAuthenticationApi({
      baseUrl: "https://api.example.com/api/v1",
      fetch: fetchMock,
    });

    await expect(api.verifyClientEmail("verification-token")).resolves.toEqual({
      status: "verified",
    });
    expect(jest.getTimerCount()).toBe(0);
  });
});
