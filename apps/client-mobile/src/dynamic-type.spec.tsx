import { render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ShortcutTile } from "./home/home-shortcuts";
import { ClientNavigation } from "./navigation";
import { PaymentStatusView } from "./payments/payment-status-view";

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
  it("gives the tab item room above the 11 pt label", async () => {
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

    expect(style.fontSize).toBe(11);
    expect(style.lineHeight).toBeUndefined();
  });

  it("sizes the payment-status disc from the glyph", async () => {
    const screen = await render(<PaymentStatusView state="pending" />);
    const disc = StyleSheet.flatten(screen.getByTestId("payment-status-disc-pending").props.style);

    expect(disc.height).toBeUndefined();
    expect(disc.minHeight).toBeGreaterThanOrEqual(72);
    expect(disc.minWidth).toBeGreaterThanOrEqual(72);
  });

  it("keeps a Home tile title's line box taller than its font", async () => {
    const screen = await render(
      <ShortcutTile icon="calendar" label="Reservar" onPress={jest.fn()} summary="Hoy" />,
    );
    const title = within(screen.getByRole("button")).getByText("Reservar");
    const style = StyleSheet.flatten(title.props.style);

    expect(style.lineHeight).toBeUndefined();
  });
});
