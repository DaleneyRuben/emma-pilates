import { toPushPermissionStatus } from "./permission-status";

describe("toPushPermissionStatus (ADR-0067)", () => {
  it("is granted when the system says so", () => {
    expect(toPushPermissionStatus({ granted: true, canAskAgain: true })).toBe("granted");
  });

  // Android 13+ answers «denied» before the app has ever asked; only a person's
  // refusal (or Settings) takes away the chance to ask.
  it("is undetermined while the system can still ask", () => {
    expect(toPushPermissionStatus({ granted: false, canAskAgain: true })).toBe("undetermined");
  });

  it("is denied once the system will not ask again", () => {
    expect(toPushPermissionStatus({ granted: false, canAskAgain: false })).toBe("denied");
  });
});
