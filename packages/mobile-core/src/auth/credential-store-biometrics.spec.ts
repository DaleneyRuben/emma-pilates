import { createCredentialStore } from "./credential-store";

const prompt = {
  authenticationPrompt: "Confirma tu identidad para iniciar sesión.",
  requireAuthentication: true,
};

function memoryStorage(entries: [string, string][] = []) {
  const values = new Map<string, string>(entries);
  return {
    values,
    storage: {
      canUseBiometricAuthentication: jest.fn(() => true),
      deleteItemAsync: jest.fn(async (key: string) => {
        values.delete(key);
      }),
      getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
      setItemAsync: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    },
  };
}

const key = { deviceKey: "device-key", unlockSecret: "unlock-secret" };

// ADR-0112: the unlock secret waits behind the fingerprint or Face ID; the
// device key, replaced on every use, does not, so Android asks only once.
describe("createCredentialStore biometric key", () => {
  it("keeps the unlock secret behind the prompt and the device key outside it", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage, "client");

    await store.saveBiometricKey(key);

    expect(storage.setItemAsync).toHaveBeenCalledWith(
      "client.biometric-unlock-secret",
      "unlock-secret",
      prompt,
    );
    expect(storage.setItemAsync).toHaveBeenCalledWith("client.biometric-device-key", "device-key");
    await expect(store.hasBiometricKey()).resolves.toBe(true);
    await expect(store.loadBiometricDeviceKey()).resolves.toBe("device-key");
  });

  it("reads the unlock secret only behind the prompt", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage, "staff");
    await store.saveBiometricKey(key);

    await expect(store.readUnlockSecret()).resolves.toBe("unlock-secret");
    expect(storage.getItemAsync).toHaveBeenCalledWith("staff.biometric-unlock-secret", prompt);
  });

  it("lets a cancelled prompt reject and keeps the key", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage);
    await store.saveBiometricKey(key);
    storage.getItemAsync.mockRejectedValueOnce(new Error("User canceled the authentication"));

    await expect(store.readUnlockSecret()).rejects.toThrow("canceled");
    await expect(store.hasBiometricKey()).resolves.toBe(true);
  });

  it("replaces the device key without asking", async () => {
    const { storage, values } = memoryStorage();
    const store = createCredentialStore(storage);
    await store.saveBiometricKey(key);
    storage.setItemAsync.mockClear();

    await store.replaceBiometricDeviceKey("next-device-key");

    expect(storage.setItemAsync).toHaveBeenCalledWith("biometric-device-key", "next-device-key");
    expect(values.get("biometric-unlock-secret")).toBe("unlock-secret");
  });

  it("confirms the key behind the prompt where saving did not ask", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage, "client");
    await store.saveBiometricKey(key);

    await expect(store.confirmBiometrics()).resolves.toBe(true);
    expect(storage.getItemAsync).toHaveBeenCalledWith("client.biometric-unlock-secret", prompt);
  });

  // Android prompts while it encrypts the secret, so a second read would ask twice.
  it("trusts the saved key without a second prompt where saving already asked", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage, "staff", { promptsOnSave: true });
    await store.saveBiometricKey(key);
    storage.getItemAsync.mockClear();

    await expect(store.confirmBiometrics()).resolves.toBe(true);
    expect(storage.getItemAsync).not.toHaveBeenCalledWith("staff.biometric-unlock-secret", prompt);
  });

  it("keeps the key when the session ends and forgets it only when asked", async () => {
    const { storage, values } = memoryStorage();
    const store = createCredentialStore(storage, "client");
    await store.save("session-credential");
    await store.saveBiometricKey(key);

    await store.clear();
    await expect(store.load()).resolves.toBeNull();
    await expect(store.hasBiometricKey()).resolves.toBe(true);

    await store.forgetBiometricKey();
    await expect(store.hasBiometricKey()).resolves.toBe(false);
    expect(values.has("client.biometric-unlock-secret")).toBe(false);
  });

  it("refuses to save a key where the phone has no biometrics", async () => {
    const { storage } = memoryStorage();
    storage.canUseBiometricAuthentication.mockReturnValue(false);
    const store = createCredentialStore(storage);

    expect(store.canUseBiometrics()).toBe(false);
    await expect(store.saveBiometricKey(key)).rejects.toThrow(
      "Biometric authentication is unavailable",
    );
    expect(storage.setItemAsync).not.toHaveBeenCalled();
  });

  it("remembers a declined offer per device, past sign-out", async () => {
    const { storage, values } = memoryStorage();
    const store = createCredentialStore(storage, "client");

    await expect(store.wasBiometricOfferDeclined()).resolves.toBe(false);
    await store.declineBiometricOffer();
    await store.clear();

    await expect(store.wasBiometricOfferDeclined()).resolves.toBe(true);
    expect(values.get("client.biometric-offer-declined")).toBe("true");
  });
});

// PR #372 kept the session itself behind the prompt; those phones move to a
// key on their next unlock.
describe("createCredentialStore biometric session from before ADR-0112", () => {
  const legacy: [string, string][] = [
    ["client.authentication-session-biometric", "protected-credential"],
    ["client.authentication-session-biometric-enabled", "true"],
  ];

  it("finds the protected session and reads it behind the prompt", async () => {
    const { storage } = memoryStorage(legacy);
    const store = createCredentialStore(storage, "client");

    await expect(store.hasLegacyBiometricSession()).resolves.toBe(true);
    await expect(store.loadLegacyBiometricSession()).resolves.toBe("protected-credential");
    expect(storage.getItemAsync).toHaveBeenCalledWith(
      "client.authentication-session-biometric",
      prompt,
    );
  });

  it("forgets it once moved, and with the session it belonged to", async () => {
    const { storage, values } = memoryStorage(legacy);
    const store = createCredentialStore(storage, "client");

    await store.forgetLegacyBiometricSession();
    expect(values.size).toBe(0);

    const second = memoryStorage(legacy);
    await createCredentialStore(second.storage, "client").clear();
    expect(second.values.size).toBe(0);
  });
});
