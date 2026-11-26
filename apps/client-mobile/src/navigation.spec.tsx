import { colors } from "@pilates/mobile-core";
import { fireEvent, render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ClientNavigation } from "./navigation";

function createAuthenticationApiMock() {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completeEmailChange: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    lookUpReferralCode: jest.fn(),
    readRegistrationStatus: jest.fn().mockResolvedValue("pending"),
    register: jest.fn(),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
  };
}

const defaultProps = {
  authenticationApi: createAuthenticationApiMock(),
  authenticationIntent: null,
  onLogin: jest.fn(),
  onRecoveryCredential: jest.fn(),
};

describe("ClientNavigation", () => {
  it("starts in the Client authentication flow", async () => {
    const screen = await render(<ClientNavigation {...defaultProps} />);

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Regístrate" })).toBeOnTheScreen();
  });

  it("submits email and password through the Client Login boundary", async () => {
    const onLogin = jest.fn().mockResolvedValue(undefined);
    const screen = await render(<ClientNavigation {...defaultProps} onLogin={onLogin} />);

    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "local password");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(onLogin).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "local password",
    });
  });

  it("renders the authenticated Client tabs", async () => {
    const screen = await render(<ClientNavigation {...defaultProps} role="client" />);

    expect(screen.getByLabelText("Inicio")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Iniciar sesión")).not.toBeOnTheScreen();
  });

  // Rosa Emma: the open tab is a 600 pill with a white icon and label; the
  // label keeps its weight and never drops under 12 pt (follow-up 285).
  it("draws the open tab white on its pill and the others in rosa profundo", async () => {
    const screen = await render(<ClientNavigation {...defaultProps} role="client" />);
    // React Navigation cross-fades an active and an idle copy of each icon.
    const icon = (name: string) =>
      screen
        .getAllByTestId(`client-tab-icon-${name}`, { includeHiddenElements: true })
        .find((copy) => StyleSheet.flatten(copy.parent?.props.style)?.opacity === 1);

    expect(icon("home")).toHaveProp("stroke", colors.onPrimary);
    for (const name of ["booking", "bookings", "profile"]) {
      expect(icon(name)).toHaveProp("stroke", colors.text);
    }
    const tabLabel = (name: string) =>
      within(screen.getByRole("button", { name: new RegExp(`^${name}, tab`) })).getByText(name);
    expect(tabLabel("Inicio")).toHaveStyle({
      color: colors.onPrimary,
      fontFamily: "WorkSans_700Bold",
      fontSize: 12,
    });
    expect(tabLabel("Reservar")).toHaveStyle({
      color: colors.text,
      fontFamily: "WorkSans_700Bold",
      fontSize: 12,
    });
  });

  it("does not render Staff navigation for a Staff identity", async () => {
    const screen = await render(<ClientNavigation {...defaultProps} role="trainer" />);

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Mi agenda")).not.toBeOnTheScreen();
  });
});
