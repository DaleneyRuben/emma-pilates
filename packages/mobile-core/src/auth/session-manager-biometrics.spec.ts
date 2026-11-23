import { createSessionManager } from "./session-manager";

const principal = {
  accountId: "account-1",
  identity: { clientId: "client-1", kind: "client" as const },
};

function biometricStore(overrides: Record<string, unknown> = {}) {
  return {
    canUseBiometrics: jest.fn(() => true),
    clear: jest.fn(),
    confirmBiometrics: jest.fn().mockResolvedValue(true),
    declineBiometricOffer: jest.fn(),
    hasBiometricCredential: jest.fn().mockResolvedValue(false),
    load: jest.fn().mockResolvedValue(null),
    loadWithBiometrics: jest.fn().mockResolvedValue("protected-credential"),
    save: jest.fn(),
    saveWithBiometrics: jest.fn(),
    wasBiometricOfferDeclined: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function managerWith(credentialStore: ReturnType<typeof biometricStore>) {
  return createSessionManager({
    clearAccountCache: jest.fn(),
    credentialStore,
    resolveCurrent: jest.fn().mockResolvedValue(principal),
    revokeCurrent: jest.fn(),
  });
}

describe("createSessionManager biometrics", () => {
  // The API fetcher reads the credential here: after a biometric unlock only
  // the protected copy is stored, so the plain store alone would answer null.
  it("answers the active credential before the stored one", async () => {
    const store = biometricStore({ load: jest.fn().mockResolvedValue("stored-credential") });
    const manager = managerWith(store);

    await expect(manager.getCredential()).resolves.toBe("stored-credential");
    await manager.unlockWithBiometrics();

    await expect(manager.getCredential()).resolves.toBe("protected-credential");
  });

  it("protects the active credential and confirms it behind the prompt", async () => {
    const store = biometricStore();
    const manager = managerWith(store);
    await manager.start("password-credential");

    await expect(manager.enableBiometrics()).resolves.toBe(true);
    expect(store.saveWithBiometrics).toHaveBeenCalledWith("password-credential");
    expect(store.confirmBiometrics).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the prompt is cancelled", { confirmBiometrics: jest.fn().mockRejectedValue(new Error("x")) }],
    ["the copy reads back empty", { confirmBiometrics: jest.fn().mockResolvedValue(false) }],
    ["saving fails", { saveWithBiometrics: jest.fn().mockRejectedValue(new Error("x")) }],
  ])("keeps the plain session when %s", async (_case, overrides) => {
    const store = biometricStore(overrides);
    const manager = managerWith(store);
    await manager.start("password-credential");
    store.save.mockClear();

    await expect(manager.enableBiometrics()).resolves.toBe(false);
    expect(store.save).toHaveBeenCalledWith("password-credential");
  });

  it("enables nothing without an active session", async () => {
    const store = biometricStore();

    await expect(managerWith(store).enableBiometrics()).resolves.toBe(false);
    expect(store.saveWithBiometrics).not.toHaveBeenCalled();
  });

  it("turns biometrics off by storing the plain copy again", async () => {
    const store = biometricStore();
    const manager = managerWith(store);
    await manager.unlockWithBiometrics();

    await manager.disableBiometrics();

    expect(store.save).toHaveBeenCalledWith("protected-credential");
  });

  it("lets a cancelled unlock reject without forgetting anything", async () => {
    const store = biometricStore({
      loadWithBiometrics: jest.fn().mockRejectedValue(new Error("User canceled")),
    });

    await expect(managerWith(store).unlockWithBiometrics()).rejects.toThrow("canceled");
    expect(store.clear).not.toHaveBeenCalled();
  });

  it("reports the device's ability, the stored state, and a declined offer", async () => {
    const store = biometricStore({
      hasBiometricCredential: jest.fn().mockResolvedValue(true),
      wasBiometricOfferDeclined: jest.fn().mockResolvedValue(true),
    });
    const manager = managerWith(store);

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
