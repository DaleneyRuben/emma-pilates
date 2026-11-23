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
      canUseBiometricAuthentication: () => true,
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

// Biometric opt-in: the offer after a password sign-in, Perfil's switch, and
// the unlock on the next launch.
describe("createCredentialStore biometrics", () => {
  it("confirms the protected copy by reading it once behind the prompt", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage, "client");
    await store.saveWithBiometrics("protected-credential");

    await expect(store.confirmBiometrics()).resolves.toBe(true);
    expect(storage.getItemAsync).toHaveBeenCalledWith(
      "client.authentication-session-biometric",
      prompt,
    );
  });

  it("answers false when the protected copy cannot be read back", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage);

    await expect(store.confirmBiometrics()).resolves.toBe(false);
  });

  it("lets a cancelled confirmation reject", async () => {
    const { storage } = memoryStorage();
    storage.getItemAsync.mockRejectedValueOnce(new Error("User canceled the authentication"));
    const store = createCredentialStore(storage);

    await expect(store.confirmBiometrics()).rejects.toThrow("canceled");
  });

  // Android prompts while it encrypts the copy, so a second read would ask twice.
  it("trusts the saved marker without a second prompt where saving already asked", async () => {
    const { storage } = memoryStorage();
    const store = createCredentialStore(storage, "staff", { promptsOnSave: true });
    await store.saveWithBiometrics("protected-credential");
    storage.getItemAsync.mockClear();

    await expect(store.confirmBiometrics()).resolves.toBe(true);
    expect(storage.getItemAsync).not.toHaveBeenCalledWith(
      "staff.authentication-session-biometric",
      prompt,
    );
  });

  it("keeps the protected copy when the person cancels the unlock prompt", async () => {
    const { storage, values } = memoryStorage([
      ["authentication-session-biometric", "protected-credential"],
      ["authentication-session-biometric-enabled", "true"],
    ]);
    storage.getItemAsync.mockRejectedValueOnce(new Error("User canceled the authentication"));
    const store = createCredentialStore(storage);

    await expect(store.loadWithBiometrics()).rejects.toThrow("canceled");
    expect(values.get("authentication-session-biometric")).toBe("protected-credential");
    await expect(store.hasBiometricCredential()).resolves.toBe(true);
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
