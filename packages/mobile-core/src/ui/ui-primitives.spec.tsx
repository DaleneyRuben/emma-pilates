import { render } from "@testing-library/react-native";

import { BodyText } from "./body-text";
import { Heading } from "./heading";
import { PrimaryButton } from "./primary-button";
import { Screen } from "./screen";

describe("mobile UI primitives", () => {
  it("uses the approved Lora title styling for headings", async () => {
    const screen = await render(
      <Heading accessibilityLabel="Emma Pilates Studio">Emma Pilates Studio</Heading>,
    );

    expect(screen.getByLabelText("Emma Pilates Studio")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 30,
    });
  });

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

  it("uses the approved Work Sans body styling", async () => {
    const screen = await render(
      <BodyText accessibilityLabel="Movimiento, equilibrio, bienestar">
        Movimiento · Equilibrio · Bienestar
      </BodyText>,
    );

    expect(screen.getByLabelText("Movimiento, equilibrio, bienestar")).toHaveStyle({
      fontFamily: "WorkSans_400Regular",
      fontSize: 15,
    });
  });
});
