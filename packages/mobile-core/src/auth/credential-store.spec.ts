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

  describe("whether this phone was seen to support biometrics", () => {
    const memoryStorage = (entries: [string, string][] = []) => {
      const values = new Map<string, string>(entries);
      return {
        values,
        storage: {
          deleteItemAsync: async (key: string) => void values.delete(key),
          getItemAsync: async (key: string) => values.get(key) ?? null,
          setItemAsync: async (key: string, value: string) => void values.set(key, value),
        },
      };
    };

    it("remembers it per application, past sign-out", async () => {
      const { storage, values } = memoryStorage();
      const store = createCredentialStore(storage, "client");
      await expect(store.wasBiometricSupportSeen()).resolves.toBe(false);

      await store.rememberBiometricSupport();
      await store.clear();

      expect(values.get("client.biometrics-supported")).toBe("true");
      await expect(store.wasBiometricSupportSeen()).resolves.toBe(true);
    });

    it.each([
      ["«Ahora no» answered the offer", "client.biometric-offer-declined", "true"],
      ["a biometric key is kept", "client.biometric-device-key", "device-key"],
    ])("counts it when %s", async (_label, key, value) => {
      const { storage } = memoryStorage([[key, value]]);

      await expect(
        createCredentialStore(storage, "client").wasBiometricSupportSeen(),
      ).resolves.toBe(true);
    });
  });

  it("asks the system whether it refuses biometrics to the app", async () => {
    const storage = {
      deleteItemAsync: jest.fn(),
      getItemAsync: jest.fn().mockResolvedValue(null),
      setItemAsync: jest.fn(),
    };

    await expect(createCredentialStore(storage).isBiometricRefusedBySystem()).resolves.toBe(false);
    await expect(
      createCredentialStore(storage, "client", {
        biometricRefusal: async () => true,
      }).isBiometricRefusedBySystem(),
    ).resolves.toBe(true);
  });
});
