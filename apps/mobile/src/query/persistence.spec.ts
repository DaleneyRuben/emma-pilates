import { getPersistedCacheKey, shouldPersistQuery } from "./persistence";

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
});
