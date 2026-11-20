import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ScreenTopBar } from "./screen-top-bar";
import { Text } from "./text";
import { maxTextScale, textVariants } from "./type-scale";
import { UnreadCountPill } from "./unread-count-pill";

// UX-016 findings A1 and A2, follow-up 285 rule 9: every variant carries its
// own line height, which React Native scales with the font when the phone's
// text size grows, up to 1.3 times; no box is fixed to one line's height.
describe("Dynamic Type boxes", () => {
  it("lets a screen title wrap onto a second line", async () => {
    const screen = await render(<ScreenTopBar onBack={jest.fn()} title="Reservas de la clienta" />);

    expect(screen.getByRole("header")).not.toHaveProp("numberOfLines", 1);
    expect(screen.getByTestId("screen-top-bar")).not.toHaveStyle({ flexDirection: "row" });
  });

  it("gives every variant a line box at least as tall as its font", () => {
    for (const variant of Object.values(textVariants)) {
      expect(variant.lineHeight).toBeGreaterThanOrEqual(variant.fontSize);
    }
  });

  it("caps the growth of every text at 1.3 times", async () => {
    const screen = await render(
      <Text maxFontSizeMultiplier={2} variant="cuerpo">
        La clase vuelve al saldo.
      </Text>,
    );

    expect(screen.getByText("La clase vuelve al saldo.")).toHaveProp(
      "maxFontSizeMultiplier",
      maxTextScale,
    );
  });

  it("sizes the unread pill from its label", async () => {
    const screen = await render(<UnreadCountPill count={2} testID="unread-pill" />);
    const pill = StyleSheet.flatten(
      screen.getByTestId("unread-pill", { includeHiddenElements: true }).props.style,
    );
    const label = StyleSheet.flatten(
      screen.getByText("2", { includeHiddenElements: true }).props.style,
    );

    expect(pill.height).toBeUndefined();
    expect(pill.minHeight).toBeGreaterThanOrEqual(label.fontSize);
    expect(label).toMatchObject(textVariants.pastilla);
  });
});
