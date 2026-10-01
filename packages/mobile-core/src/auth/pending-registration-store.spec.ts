import { createPendingRegistrationStore } from "./pending-registration-store";

function createStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    deleteItemAsync: jest.fn(async (key: string) => {
      items.delete(key);
    }),
    getItemAsync: jest.fn(async (key: string) => items.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      items.set(key, value);
    }),
  };
}

const pending = {
  email: "ana@example.com",
  pendingExpiresAt: Date.UTC(2026, 9, 8, 12),
  registrationContinuation: "continuation-secret",
};

describe("pending registration store", () => {
  it("keeps the pending registration under the app's namespace", async () => {
    const storage = createStorage();
    const store = createPendingRegistrationStore(storage, "client");

    await store.save(pending);

    expect([...storage.items.keys()]).toEqual(["client.pending-registration"]);
    await expect(store.load()).resolves.toEqual(pending);
  });

  it("forgets it when cleared", async () => {
    const storage = createStorage();
    const store = createPendingRegistrationStore(storage, "client");
    await store.save(pending);

    await store.clear();

    await expect(store.load()).resolves.toBeNull();
    expect(storage.items.size).toBe(0);
  });

  it("drops a stored value it cannot read instead of failing the launch", async () => {
    const storage = createStorage({
      "client.pending-registration": JSON.stringify({ email: "ana@example.com" }),
    });
    const store = createPendingRegistrationStore(storage, "client");

    await expect(store.load()).resolves.toBeNull();
    expect(storage.items.size).toBe(0);
  });

  it("treats unavailable secure storage as no pending registration", async () => {
    const storage = createStorage();
    storage.getItemAsync.mockRejectedValueOnce(new Error("keychain locked"));
    const store = createPendingRegistrationStore(storage, "client");

    await expect(store.load()).resolves.toBeNull();
  });
});
