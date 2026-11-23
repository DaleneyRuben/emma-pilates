import { createBiometricKeyApi } from "./biometric-key-api";

const baseUrl = "https://api.example.com/api/v1";
const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { headers, status });
const header = (fetchMock: jest.Mock, name: string) =>
  (fetchMock.mock.calls[0][1]?.headers as Headers).get(name);

describe("createBiometricKeyApi", () => {
  it("asks for a key for this installation with the session's credential", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(json({ deviceKey: "device-key", unlockSecret: "unlock-secret" }, 201));
    const api = createBiometricKeyApi({ baseUrl, fetch: fetchMock });

    await expect(
      api.issue({ clientIdentifier: "installation-1", credential: "session-credential" }),
    ).resolves.toEqual({ deviceKey: "device-key", unlockSecret: "unlock-secret" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/biometric-keys`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(header(fetchMock, "authorization")).toBe("Bearer session-credential");
    expect(header(fetchMock, "x-client-identifier")).toBe("installation-1");
  });

  it("fails loudly when no key is issued", async () => {
    const api = createBiometricKeyApi({
      baseUrl,
      fetch: jest.fn().mockResolvedValue(json({ code: "internal_error" }, 500)),
    });

    await expect(
      api.issue({ clientIdentifier: "installation-1", credential: "session-credential" }),
    ).rejects.toThrow("500");
  });

  it("exchanges the key for a session and the next key", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(json({ credential: "new-credential", deviceKey: "next-key" }, 201));
    const api = createBiometricKeyApi({ baseUrl, fetch: fetchMock });

    await expect(
      api.exchange({
        clientIdentifier: "installation-1",
        deviceKey: "device-key",
        unlockSecret: "unlock-secret",
      }),
    ).resolves.toEqual({ credential: "new-credential", deviceKey: "next-key", status: "created" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/biometric-keys/exchange`,
      expect.objectContaining({
        body: JSON.stringify({ deviceKey: "device-key", unlockSecret: "unlock-secret" }),
        method: "POST",
      }),
    );
    expect(header(fetchMock, "authorization")).toBeNull();
    expect(header(fetchMock, "x-client-identifier")).toBe("installation-1");
  });

  it.each([
    [401, { status: "rejected" }],
    [429, { retryAfterSeconds: 30, status: "throttled" }],
  ])("answers %s as a result the unlock can show", async (status, result) => {
    const api = createBiometricKeyApi({
      baseUrl,
      fetch: jest.fn().mockResolvedValue(json({}, status, { "Retry-After": "30" })),
    });

    await expect(
      api.exchange({ clientIdentifier: "i", deviceKey: "k", unlockSecret: "u" }),
    ).resolves.toEqual(result);
  });

  it("lets a server error reject, so the unlock says to try again", async () => {
    const api = createBiometricKeyApi({
      baseUrl,
      fetch: jest.fn().mockResolvedValue(json({}, 503)),
    });

    await expect(
      api.exchange({ clientIdentifier: "i", deviceKey: "k", unlockSecret: "u" }),
    ).rejects.toThrow("503");
  });

  it("turns the key off without a session", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const api = createBiometricKeyApi({ baseUrl, fetch: fetchMock });

    await api.revoke({ clientIdentifier: "installation-1", deviceKey: "device-key" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/biometric-keys/revocation`,
      expect.objectContaining({ body: JSON.stringify({ deviceKey: "device-key" }) }),
    );
    expect(header(fetchMock, "x-client-identifier")).toBe("installation-1");
  });
});
