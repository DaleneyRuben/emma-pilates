import { render } from "@testing-library/react-native";

import { StaffNavigation } from "./navigation";

function createAuthenticationApiMock() {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
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

describe("StaffNavigation", () => {
  it("rejects Client verification links", async () => {
    const authenticationApi = createAuthenticationApiMock();
    const screen = await render(
      <StaffNavigation
        {...defaultProps}
        authenticationApi={authenticationApi}
        authenticationIntent={{
          token: "client-verification-token",
          type: "verify-email",
        }}
      />,
    );

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    expect(authenticationApi.verifyClientEmail).not.toHaveBeenCalled();
  });

  it("starts in the Staff authentication flow without Client registration", async () => {
    const screen = await render(<StaffNavigation {...defaultProps} />);

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Crear cuenta" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Olvidé mi contraseña" }),
    ).toBeOnTheScreen();
  });

  it.each([
    ["trainer", "Mi agenda"],
    ["assistant", "Buscar cliente"],
    ["administrator", "Pagos pendientes"],
    ["nutritionist", "Mi agenda"],
  ] as const)("routes %s to its Staff destination", async (role, label) => {
    const screen = await render(
      <StaffNavigation {...defaultProps} role={role} />,
    );

    expect(screen.getByLabelText(label)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Iniciar sesión")).not.toBeOnTheScreen();
  });

  it("does not render Client navigation for a Client identity", async () => {
    const screen = await render(
      <StaffNavigation {...defaultProps} role="client" />,
    );

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Inicio")).not.toBeOnTheScreen();
  });
});
