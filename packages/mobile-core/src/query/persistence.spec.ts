import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearPersistedAccountCache,
  getPersistedCacheKey,
  shouldPersistQuery,
} from "./persistence";

describe("mobile query persistence", () => {
  it("isolates persisted cache data by account", () => {
    expect(getPersistedCacheKey("account-1")).toBe("pilates-query:account-1");
  });

  it("persists only the approved read-only query projections", () => {
    expect(shouldPersistQuery(["/api/v1/sessions", { branchId: "b" }])).toBe(
      true,
    );
    expect(shouldPersistQuery(["/api/v1/trainer/sessions", { on: "d" }])).toBe(
      true,
    );
    expect(shouldPersistQuery(["/api/v1/bookings"])).toBe(true);
    expect(shouldPersistQuery(["/api/v1/clients/current/subscription"])).toBe(
      true,
    );
    expect(shouldPersistQuery(["/api/v1/sessions/session-1"])).toBe(false);
    expect(shouldPersistQuery(["/api/v1/notifications", { limit: 50 }])).toBe(
      false,
    );
    expect(shouldPersistQuery(["/api/v1/payments"])).toBe(false);
    expect(shouldPersistQuery(["/api/v1/clients/current"])).toBe(false);
  });

  it("clears only the signed-out Account cache", async () => {
    await AsyncStorage.setItem(getPersistedCacheKey("account-1"), "cached");
    await AsyncStorage.setItem(getPersistedCacheKey("account-2"), "other");

    await clearPersistedAccountCache("account-1");

    await expect(
      AsyncStorage.getItem(getPersistedCacheKey("account-1")),
    ).resolves.toBeNull();
    await expect(
      AsyncStorage.getItem(getPersistedCacheKey("account-2")),
    ).resolves.toBe("other");
  });
});
