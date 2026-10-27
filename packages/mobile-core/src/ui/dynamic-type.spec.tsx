import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { BodyText } from "./body-text";
import { Heading } from "./heading";
import { ScreenTopBar } from "./screen-top-bar";
import { UnreadCountPill } from "./unread-count-pill";

// UX-016 findings A1 and A2: a fixed line box clips once Dynamic Type grows
// the font. The line height stays a multiple of the font size, and the pill
// grows from its content instead of a fixed 18 pt height.
describe("Dynamic Type boxes", () => {
  it("lets a screen title wrap onto a second line", async () => {
    const screen = await render(<ScreenTopBar onBack={jest.fn()} title="Reservas de la clienta" />);

    expect(screen.getByRole("header")).not.toHaveProp("numberOfLines", 1);
    expect(screen.getByTestId("screen-top-bar")).not.toHaveStyle({ flexDirection: "row" });
  });

  it("leaves the body line box to the font", async () => {
    const screen = await render(<BodyText>La clase vuelve al saldo.</BodyText>);
    const style = StyleSheet.flatten(screen.getByText("La clase vuelve al saldo.").props.style);

    expect(style.lineHeight).toBeUndefined();
    expect(style.fontSize).toBe(15);
  });

  it("keeps the heading line box taller than its font", async () => {
    const screen = await render(<Heading>Hola, Lucía</Heading>);
    const style = StyleSheet.flatten(screen.getByText("Hola, Lucía").props.style);

    expect(style.lineHeight).toBeUndefined();
    expect(style.fontSize).toBe(30);
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
    expect(label.lineHeight).toBeUndefined();
  });
});
