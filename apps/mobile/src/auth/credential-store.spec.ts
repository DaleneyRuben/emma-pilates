import { createCredentialStore } from "./credential-store";

describe("createCredentialStore", () => {
  it("stores, retrieves, and clears an authentication credential", async () => {
    const values = new Map<string, string>();
    const store = createCredentialStore({
      deleteItemAsync: async (key) => values.delete(key),
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => values.set(key, value),
    });

    await store.save("credential");
    expect(await store.load()).toBe("credential");

    await store.clear();
    expect(await store.load()).toBeNull();
  });
});
