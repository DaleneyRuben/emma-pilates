import { render, within } from "@testing-library/react-native";
import { textVariants } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import { ShortcutTile } from "./home/home-shortcuts";
import { ClientNavigation } from "./navigation";

function createAuthenticationApiMock() {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completeEmailChange: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    register: jest.fn(),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
  };
}

// UX-016 findings A1 and A2. The tab item grows with the label, the payment
// disc grows with the glyph, and a heading line box stays taller than the font.
describe("Dynamic Type on Client screens", () => {
  // FIX-089: no text under 12 pt, the tab labels included.
  it("gives the tab item room above the 12 pt label", async () => {
    const screen = await render(
      <ClientNavigation
        authenticationApi={createAuthenticationApiMock()}
        authenticationIntent={null}
        onLogin={jest.fn()}
        onRecoveryCredential={jest.fn()}
        role="client"
      />,
    );
    const label = within(screen.getByRole("button", { name: /^Inicio, tab/ })).getByText("Inicio");
    const style = StyleSheet.flatten(label.props.style);

    // Follow-up 285: `pastilla` carries its own line box, taller than the font.
    expect(style.fontSize).toBe(12);
    expect(style.lineHeight).toBeGreaterThan(12);
  });

  it("keeps a Home tile title's line box taller than its font", async () => {
    const screen = await render(
      <ShortcutTile icon="calendar" label="Reservar" onPress={jest.fn()} note="Hoy" />,
    );
    const title = within(screen.getByRole("button")).getByText("Reservar");
    const style = StyleSheet.flatten(title.props.style);

    // Follow-up 285: the tile title is `titulo-fila`, whose line box is 1.35 times its font.
    expect(style).toMatchObject(textVariants["titulo-fila"]);
    expect(style.lineHeight).toBeGreaterThan(style.fontSize ?? 0);
  });
});
