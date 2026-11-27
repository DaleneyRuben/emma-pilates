import { createDefaultMobileRuntime } from "./application";

const principal = {
  accountId: "account-1",
  identity: { clientId: "client-1", kind: "client" },
};

// After a biometric unlock the API fetcher must send the session manager's
// active credential, whatever the plain store answers.
describe("createDefaultMobileRuntime", () => {
  it("sends the unlocked credential with every API request", async () => {
    const fetchMock = jest.fn(
      async () =>
        new Response(JSON.stringify(principal), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
    );
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    const runtime = createDefaultMobileRuntime({
      acceptedIdentityKind: "client",
      credentialStore: {
        clear: jest.fn(),
        hasLegacyBiometricSession: jest.fn().mockResolvedValue(true),
        load: jest.fn().mockResolvedValue(null),
        loadLegacyBiometricSession: jest.fn().mockResolvedValue("protected-credential"),
        save: jest.fn(),
      },
    });

    await runtime.sessionManager.unlockWithBiometrics();
    await runtime.apiFetcher?.("/api/v1/bookings");

    const [, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer protected-credential");
  });

  it("deactivates this installation's push device, with the session's credential, before signing out", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => new Response(null, { status: 204 }),
    );
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock as typeof fetch);
    const runtime = createDefaultMobileRuntime({
      acceptedIdentityKind: "client",
      credentialStore: {
        clear: jest.fn(),
        load: jest.fn().mockResolvedValue("stored-credential"),
        save: jest.fn(),
      },
    });

    await runtime.sessionManager.logout({ accountId: "account-1", role: "client" });

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    const release = urls.findIndex((url) =>
      url.endsWith("/notifications/devices/current/deactivate"),
    );
    expect(release).toBeGreaterThanOrEqual(0);
    expect(release).toBeLessThan(
      urls.findIndex((url) => url.endsWith("/authentication-sessions/current")),
    );
    const [, init] = fetchMock.mock.calls[release]!;
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer stored-credential");
    expect(JSON.parse(String(init?.body))).toMatchObject({ reason: "logout" });
  });
});
