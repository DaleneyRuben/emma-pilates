import { createCredentialStore } from "./credential-store";

describe("createCredentialStore", () => {
  it("stores, retrieves, and clears an authentication credential", async () => {
    const values = new Map<string, string>();
    const store = createCredentialStore({
      deleteItemAsync: async (key) => {
        values.delete(key);
      },
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => {
        values.set(key, value);
      },
    });

    await store.save("credential");
    expect(await store.load()).toBe("credential");

    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it("stores and retrieves a credential behind biometric authentication", async () => {
    const values = new Map<string, string>();
    const setItemAsync = jest.fn(
      async (key: string, value: string) => {
        values.set(key, value);
      },
    );
    const getItemAsync = jest.fn(
      async (key: string) => values.get(key) ?? null,
    );
    const store = createCredentialStore({
      canUseBiometricAuthentication: () => true,
      deleteItemAsync: async (key) => {
        values.delete(key);
      },
      getItemAsync,
      setItemAsync,
    });

    await store.saveWithBiometrics("protected-credential");

    expect(await store.hasBiometricCredential()).toBe(true);
    expect(await store.load()).toBeNull();
    await expect(store.loadWithBiometrics()).resolves.toBe(
      "protected-credential",
    );
    expect(setItemAsync).toHaveBeenCalledWith(
      "authentication-session-biometric",
      "protected-credential",
      {
        authenticationPrompt: "Confirma tu identidad para iniciar sesión.",
        requireAuthentication: true,
      },
    );
    expect(getItemAsync).toHaveBeenCalledWith(
      "authentication-session-biometric",
      {
        authenticationPrompt: "Confirma tu identidad para iniciar sesión.",
        requireAuthentication: true,
      },
    );
  });
});
