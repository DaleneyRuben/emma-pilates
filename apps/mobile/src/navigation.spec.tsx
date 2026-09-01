import { fireEvent, render } from "@testing-library/react-native";

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

  it("offers Face ID only when a protected session is waiting", async () => {
    const unlockWithBiometrics = jest.fn();
    const screen = await render(
      <MobileNavigation
        onBiometricUnlock={unlockWithBiometrics}
      />,
    );

    fireEvent.press(
      screen.getByRole("button", {
        name: "Iniciar sesión con Face ID",
      }),
    );

    expect(unlockWithBiometrics).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["client", "Inicio"],
    ["trainer", "Mi agenda"],
    ["assistant", "Buscar cliente"],
    ["administrator", "Pagos pendientes"],
    ["nutritionist", "Mi agenda"],
  ] as const)("renders only the %s Role navigation", async (role, label) => {
    const screen = await render(<MobileNavigation role={role} />);

    expect(screen.getByLabelText(label)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Iniciar sesión")).not.toBeOnTheScreen();
  });

  it("hides the generated native stack header", () => {
    expect(unauthenticatedStackOptions).toEqual({ headerShown: false });
  });
});
