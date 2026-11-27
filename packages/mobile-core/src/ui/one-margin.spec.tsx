import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { FooterPanel } from "./footer-panel";
import { ScreenHeader } from "./screen-header";
import { SectionTitle } from "./section-title";
import { Text } from "./text";
import { spacing } from "./tokens";

const flat = (style: unknown) => StyleSheet.flatten(style as never) as Record<string, unknown>;

// Walkthrough n.º 8 (SYS «Un solo margen izquierdo», C11, C01k): the band's
// content, section titles and cards start at one 16 pt edge; a card's text
// sits 16 pt further in.
describe("one left margin", () => {
  it("pads the band's content 16 pt from the screen's edge", async () => {
    const screen = await render(<ScreenHeader title="Tu pago está en revisión" />);

    expect(flat(screen.getByTestId("screen-header").props.style).paddingHorizontal).toBe(
      spacing.lg,
    );
  });

  it("starts a section title on the cards' edge", async () => {
    const screen = await render(<SectionTitle>Cuenta</SectionTitle>);

    expect(flat(screen.getByText("Cuenta").props.style).paddingHorizontal ?? 0).toBe(0);
  });

  it("pads the footer's buttons 16 pt from the screen's edge", async () => {
    const screen = await render(
      <FooterPanel testID="footer">
        <Text variant="cuerpo">Volver al inicio</Text>
      </FooterPanel>,
    );

    expect(flat(screen.getByTestId("footer").props.style).paddingHorizontal).toBe(spacing.lg);
  });
});
