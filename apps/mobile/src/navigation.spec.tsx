import { render } from "@testing-library/react-native";

import {
  getRootRouteForRole,
  MobileNavigation,
  unauthenticatedStackOptions,
} from "./navigation";

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

describe("MobileNavigation", () => {
  it("starts in the unauthenticated flow", async () => {
    const screen = await render(<MobileNavigation />);

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });

  it("hides the generated native stack header", () => {
    expect(unauthenticatedStackOptions).toEqual({ headerShown: false });
  });
});
