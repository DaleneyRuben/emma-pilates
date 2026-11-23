import { createCredentialStore } from "./credential-store";

describe("createCredentialStore", () => {
  it("isolates credentials with the application namespace", async () => {
    const setItemAsync = jest.fn().mockResolvedValue(undefined);
    const store = createCredentialStore(
      {
        deleteItemAsync: jest.fn().mockResolvedValue(undefined),
        getItemAsync: jest.fn().mockResolvedValue(null),
        setItemAsync,
      },
      "staff",
    );

    await store.save("staff-credential");

    expect(setItemAsync).toHaveBeenCalledWith("staff.authentication-session", "staff-credential");
  });

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

  it("drops the protected session from before ADR-0112 after a password sign-in", async () => {
    const values = new Map<string, string>([
      ["authentication-session-biometric", "old-protected-credential"],
      ["authentication-session-biometric-enabled", "true"],
      ["biometric-device-key", "device-key"],
    ]);
    const store = createCredentialStore({
      deleteItemAsync: async (key) => {
        values.delete(key);
      },
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => {
        values.set(key, value);
      },
    });

    await store.save("new-ordinary-credential");

    await expect(store.hasLegacyBiometricSession()).resolves.toBe(false);
    await expect(store.load()).resolves.toBe("new-ordinary-credential");
    expect(values.has("authentication-session-biometric")).toBe(false);
    expect(values.get("biometric-device-key")).toBe("device-key");
  });
});
