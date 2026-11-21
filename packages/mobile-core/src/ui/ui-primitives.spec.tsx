import { render } from "@testing-library/react-native";

import { PrimaryButton } from "./primary-button";
import { Screen } from "./screen";

describe("mobile UI primitives", () => {
  it("provides a mobile-sized primary action", async () => {
    const screen = await render(<PrimaryButton label="Continuar" />);

    expect(screen.getByRole("button", { name: "Continuar" })).toHaveStyle({
      minHeight: 52,
    });
  });

  // Rosa Emma: every Client and Staff screen is drawn on 100.
  it("draws application screens on 100, as the boards do", async () => {
    const screen = await render(<Screen testID="app-screen" />);

    expect(screen.getByTestId("app-screen")).toHaveStyle({
      backgroundColor: "#F9E7DF",
    });
  });

  it("keeps application screens within the device safe area", async () => {
    const screen = await render(<Screen />);

    expect(screen.toJSON()?.type).toBe("RNCSafeAreaView");
  });
});
