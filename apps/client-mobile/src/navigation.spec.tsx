import { fireEvent, render } from "@testing-library/react-native";

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
    expect(
      screen.getByRole("button", { name: "Regístrate" }),
    ).toBeOnTheScreen();
  });

  it("submits email and password through the Client Login boundary", async () => {
    const onLogin = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <ClientNavigation {...defaultProps} onLogin={onLogin} />,
    );

    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Contraseña"),
      "local password",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    );

    expect(onLogin).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "local password",
    });
  });

  it("renders the authenticated Client tabs", async () => {
    const screen = await render(
      <ClientNavigation {...defaultProps} role="client" />,
    );

    expect(screen.getByLabelText("Inicio")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Iniciar sesión")).not.toBeOnTheScreen();
  });

  it("does not render Staff navigation for a Staff identity", async () => {
    const screen = await render(
      <ClientNavigation {...defaultProps} role="trainer" />,
    );

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Mi agenda")).not.toBeOnTheScreen();
  });
});
