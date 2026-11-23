import { createSessionManager } from "./session-manager";

const principal = {
  accountId: "account-1",
  identity: { clientId: "client-1", kind: "client" as const },
};
const session = { accountId: "account-1", role: "client" };

function biometricStore(overrides: Record<string, unknown> = {}) {
  return {
    canUseBiometrics: jest.fn(() => true),
    clear: jest.fn(),
    confirmBiometrics: jest.fn().mockResolvedValue(true),
    declineBiometricOffer: jest.fn(),
    forgetBiometricKey: jest.fn(),
    forgetLegacyBiometricSession: jest.fn(),
    hasBiometricKey: jest.fn().mockResolvedValue(true),
    hasLegacyBiometricSession: jest.fn().mockResolvedValue(false),
    load: jest.fn().mockResolvedValue(null),
    loadBiometricDeviceKey: jest.fn().mockResolvedValue("device-key"),
    loadLegacyBiometricSession: jest.fn().mockResolvedValue("legacy-credential"),
    readUnlockSecret: jest.fn().mockResolvedValue("unlock-secret"),
    replaceBiometricDeviceKey: jest.fn(),
    save: jest.fn(),
    saveBiometricKey: jest.fn(),
    wasBiometricOfferDeclined: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function keyApi(overrides: Record<string, unknown> = {}) {
  return {
    exchange: jest
      .fn()
      .mockResolvedValue({
        credential: "new-credential",
        deviceKey: "next-key",
        status: "created",
      }),
    issue: jest.fn().mockResolvedValue({ deviceKey: "issued-key", unlockSecret: "issued-secret" }),
    revoke: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function managerWith(
  credentialStore: ReturnType<typeof biometricStore>,
  biometricKeys = keyApi(),
  resolveCurrent = jest.fn().mockResolvedValue(principal),
) {
  const revokeCurrent = jest.fn();
  const manager = createSessionManager({
    biometricKeys,
    clearAccountCache: jest.fn(),
    credentialStore,
    installationIdentifier: async () => "installation-1",
    resolveCurrent,
    revokeCurrent,
  });
  return { manager, revokeCurrent };
}

describe("createSessionManager biometric key", () => {
  it("asks for a key with the active session and keeps it behind the prompt", async () => {
    const store = biometricStore();
    const api = keyApi();
    const { manager } = managerWith(store, api);
    await manager.start("password-credential");

    await expect(manager.enableBiometrics()).resolves.toBe(true);

    expect(api.issue).toHaveBeenCalledWith({
      clientIdentifier: "installation-1",
      credential: "password-credential",
    });
    expect(store.saveBiometricKey).toHaveBeenCalledWith({
      deviceKey: "issued-key",
      unlockSecret: "issued-secret",
    });
    expect(store.confirmBiometrics).toHaveBeenCalledTimes(1);
  });

  it("enables nothing when the server issues no key", async () => {
    const store = biometricStore();
    const { manager } = managerWith(
      store,
      keyApi({ issue: jest.fn().mockRejectedValue(new Error("offline")) }),
    );
    await manager.start("password-credential");

    await expect(manager.enableBiometrics()).resolves.toBe(false);
    expect(store.saveBiometricKey).not.toHaveBeenCalled();
  });

  it.each([
    ["the prompt is cancelled", { saveBiometricKey: jest.fn().mockRejectedValue(new Error("x")) }],
    ["the key reads back empty", { confirmBiometrics: jest.fn().mockResolvedValue(false) }],
  ])("turns the new key off again when %s", async (_case, overrides) => {
    const store = biometricStore(overrides);
    const api = keyApi();
    const { manager } = managerWith(store, api);
    await manager.start("password-credential");

    await expect(manager.enableBiometrics()).resolves.toBe(false);
    expect(api.revoke).toHaveBeenCalledWith({
      clientIdentifier: "installation-1",
      deviceKey: "issued-key",
    });
    expect(store.forgetBiometricKey).toHaveBeenCalled();
  });

  it("enables nothing without an active session", async () => {
    const store = biometricStore();
    const api = keyApi();

    await expect(managerWith(store, api).manager.enableBiometrics()).resolves.toBe(false);
    expect(api.issue).not.toHaveBeenCalled();
  });

  it("turns biometrics off on the server and forgets the key, even offline", async () => {
    const store = biometricStore();
    const api = keyApi({ revoke: jest.fn().mockRejectedValue(new Error("offline")) });

    await managerWith(store, api).manager.disableBiometrics();

    expect(api.revoke).toHaveBeenCalledWith({
      clientIdentifier: "installation-1",
      deviceKey: "device-key",
    });
    expect(store.forgetBiometricKey).toHaveBeenCalled();
  });

  it("keeps the key when the person signs out", async () => {
    const store = biometricStore({ load: jest.fn().mockResolvedValue("credential") });
    const { manager, revokeCurrent } = managerWith(store);

    await manager.logout(session as never);

    expect(revokeCurrent).toHaveBeenCalledWith("credential");
    expect(store.clear).toHaveBeenCalled();
    expect(store.forgetBiometricKey).not.toHaveBeenCalled();
  });

  it("forgets a key left on the phone when someone signs in with a password", async () => {
    const store = biometricStore();

    await managerWith(store).manager.start("password-credential");

    expect(store.forgetBiometricKey).toHaveBeenCalled();
  });

  it("unlocks with the key, keeps the new session and the next key", async () => {
    const store = biometricStore();
    const api = keyApi();
    const { manager } = managerWith(store, api);

    await expect(manager.unlockWithBiometrics()).resolves.toEqual({
      session,
      status: "signed-in",
    });

    expect(api.exchange).toHaveBeenCalledWith({
      clientIdentifier: "installation-1",
      deviceKey: "device-key",
      unlockSecret: "unlock-secret",
    });
    expect(store.replaceBiometricDeviceKey).toHaveBeenCalledWith("next-key");
    expect(store.save).toHaveBeenCalledWith("new-credential");
    await expect(manager.getCredential()).resolves.toBe("new-credential");
  });

  it("stays locked when the prompt is cancelled", async () => {
    const store = biometricStore({
      readUnlockSecret: jest.fn().mockRejectedValue(new Error("User canceled")),
    });
    const api = keyApi();

    await expect(managerWith(store, api).manager.unlockWithBiometrics()).resolves.toEqual({
      status: "cancelled",
    });
    expect(api.exchange).not.toHaveBeenCalled();
    expect(store.forgetBiometricKey).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the server no longer knows the key",
      {},
      keyApi({ exchange: jest.fn().mockResolvedValue({ status: "rejected" }) }),
    ],
    [
      "the phone lost the unlock secret",
      { readUnlockSecret: jest.fn().mockResolvedValue(null) },
      keyApi(),
    ],
  ])("forgets the key when %s", async (_case, overrides, api) => {
    const store = biometricStore(overrides);

    await expect(managerWith(store, api).manager.unlockWithBiometrics()).resolves.toEqual({
      status: "invalid",
    });
    expect(store.forgetBiometricKey).toHaveBeenCalled();
  });

  it.each([
    ["the network fails", jest.fn().mockRejectedValue(new TypeError("Network request failed"))],
    [
      "the server throttles",
      jest.fn().mockResolvedValue({ retryAfterSeconds: 30, status: "throttled" }),
    ],
  ])("keeps the key and reports a failure when %s", async (_case, exchange) => {
    const store = biometricStore();

    await expect(
      managerWith(store, keyApi({ exchange })).manager.unlockWithBiometrics(),
    ).resolves.toEqual({ status: "failed" });
    expect(store.forgetBiometricKey).not.toHaveBeenCalled();
  });

  it("reports the device's ability, the stored state, and a declined offer", async () => {
    const store = biometricStore({ wasBiometricOfferDeclined: jest.fn().mockResolvedValue(true) });
    const { manager } = managerWith(store);

    expect(manager.canUseBiometrics()).toBe(true);
    await expect(manager.isBiometricsEnabled()).resolves.toBe(true);
    await expect(manager.wasBiometricOfferDeclined()).resolves.toBe(true);
    await manager.declineBiometricOffer();
    expect(store.declineBiometricOffer).toHaveBeenCalledTimes(1);
  });

  it("offers nothing on a store without biometrics", async () => {
    const manager = createSessionManager({
      clearAccountCache: jest.fn(),
      credentialStore: { clear: jest.fn(), load: jest.fn(), save: jest.fn() },
      resolveCurrent: jest.fn(),
      revokeCurrent: jest.fn(),
    });

    expect(manager.canUseBiometrics()).toBe(false);
    await expect(manager.isBiometricsEnabled()).resolves.toBe(false);
    await expect(manager.wasBiometricOfferDeclined()).resolves.toBe(false);
  });
});

// Phones that turned biometrics on under PR #372 hold the session itself
// behind the prompt; their next unlock moves them to a key.
describe("createSessionManager biometric session from before ADR-0112", () => {
  const legacyStore = (overrides: Record<string, unknown> = {}) =>
    biometricStore({
      hasBiometricKey: jest.fn().mockResolvedValue(false),
      hasLegacyBiometricSession: jest.fn().mockResolvedValue(true),
      ...overrides,
    });

  it("counts as biometrics turned on", async () => {
    await expect(managerWith(legacyStore()).manager.hasBiometricSession()).resolves.toBe(true);
  });

  it("signs in with the old session and moves the phone to a key", async () => {
    const store = legacyStore();
    const api = keyApi();
    const { manager } = managerWith(store, api);

    await expect(manager.unlockWithBiometrics()).resolves.toEqual({
      session,
      status: "signed-in",
    });

    expect(store.loadLegacyBiometricSession).toHaveBeenCalled();
    expect(store.save).toHaveBeenCalledWith("legacy-credential");
    expect(store.forgetLegacyBiometricSession).toHaveBeenCalled();
    expect(api.issue).toHaveBeenCalledWith({
      clientIdentifier: "installation-1",
      credential: "legacy-credential",
    });
    expect(store.saveBiometricKey).toHaveBeenCalled();
    expect(store.confirmBiometrics).not.toHaveBeenCalled();
    expect(api.exchange).not.toHaveBeenCalled();
  });

  it("stays signed in without biometrics when no key can be stored", async () => {
    const store = legacyStore({ saveBiometricKey: jest.fn().mockRejectedValue(new Error("x")) });

    await expect(managerWith(store).manager.unlockWithBiometrics()).resolves.toEqual({
      keyLost: true,
      session,
      status: "signed-in",
    });
  });

  it("stays locked when the old prompt is cancelled", async () => {
    const store = legacyStore({
      loadLegacyBiometricSession: jest.fn().mockRejectedValue(new Error("User canceled")),
    });

    await expect(managerWith(store).manager.unlockWithBiometrics()).resolves.toEqual({
      status: "cancelled",
    });
    expect(store.forgetLegacyBiometricSession).not.toHaveBeenCalled();
  });

  it("forgets an old session the server already ended", async () => {
    const store = legacyStore();
    const { manager } = managerWith(store, keyApi(), jest.fn().mockResolvedValue(null));

    await expect(manager.unlockWithBiometrics()).resolves.toEqual({ status: "invalid" });
    expect(store.forgetLegacyBiometricSession).toHaveBeenCalled();
  });
});
