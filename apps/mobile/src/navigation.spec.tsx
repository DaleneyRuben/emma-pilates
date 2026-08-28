import { getRootRouteForRole } from "./navigation";

describe("getRootRouteForRole", () => {
  it("routes an unauthenticated app state to the public flow", () => {
    expect(getRootRouteForRole()).toBe("Unauthenticated");
  });

  it.each([
    ["client", "Client"],
    ["trainer", "Trainer"],
    ["assistant", "Assistant"],
    ["administrator", "Administrator"],
    ["nutritionist", "Nutritionist"],
  ] as const)("routes %s to the %s flow", (role, expectedRoute) => {
    expect(getRootRouteForRole(role)).toBe(expectedRoute);
  });
});
