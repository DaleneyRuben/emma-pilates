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
});
