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
    expect(shouldPersistQuery(["sessions"])).toBe(true);
    expect(shouldPersistQuery(["upcoming-bookings"])).toBe(true);
    expect(shouldPersistQuery(["subscription-summary"])).toBe(true);
    expect(shouldPersistQuery(["payments"])).toBe(false);
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
