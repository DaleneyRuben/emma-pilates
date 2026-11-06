import { fireEvent, render } from "@testing-library/react-native";

import { StaffNavigation } from "./navigation";

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
    expect(screen.queryByRole("button", { name: "Regístrate" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" })).toBeOnTheScreen();
  });

  it.each([
    ["trainer", "Mi agenda"],
    ["assistant", "Buscar cliente"],
    ["administrator", "Pagos pendientes"],
    ["nutritionist", "Mi agenda"],
    ["coordinator", "Buscar cliente"],
  ] as const)("routes %s to its Staff destination", async (role, label) => {
    const screen = await render(<StaffNavigation {...defaultProps} role={role} />);

    expect(screen.getByLabelText(label)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Iniciar sesión")).not.toBeOnTheScreen();
  });

  // Follow-up 225 §8: Perfil replaces the avatar on every root (owner, 2026-11-02).
  it.each([
    ["trainer", ["Agenda", "Mis pagos", "Perfil"]],
    ["assistant", ["Clientes", "Horario", "Caja", "Perfil"]],
    ["nutritionist", ["Agenda", "Disponibilidad", "Perfil"]],
    ["administrator", ["Pagos", "Clientes", "Horario", "Perfil"]],
    ["coordinator", ["Clientes", "Para contactar", "Horario", "Perfil"]],
  ] as const)("gives %s its own tab bar", async (role, tabs) => {
    const screen = await render(<StaffNavigation {...defaultProps} role={role} />);

    const labels = screen
      .getAllByTestId(/^tab-/)
      .map((tab) => String(tab.props.accessibilityLabel).split(",")[0]);
    expect(labels).toEqual(tabs);
    expect(screen.queryByTestId("account-avatar")).not.toBeOnTheScreen();
  });

  it("does not render Client navigation for a Client identity", async () => {
    const screen = await render(<StaffNavigation {...defaultProps} role="client" />);

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Inicio")).not.toBeOnTheScreen();
  });

  // FIX-039: the link the studio's email change sends to the new address
  // opens here, signed in or not, and completes without a session.
  it.each([undefined, "trainer"] as const)(
    "confirms a new email from its link (role %s)",
    async (role) => {
      const authenticationApi = createAuthenticationApiMock();
      authenticationApi.completeEmailChange.mockResolvedValue({ status: "changed" });
      const screen = await render(
        <StaffNavigation
          {...defaultProps}
          authenticationApi={authenticationApi}
          authenticationIntent={{ token: "change-secret", type: "confirm-email-change" }}
          role={role}
        />,
      );

      expect(await screen.findByText("Correo confirmado")).toBeOnTheScreen();
      expect(authenticationApi.completeEmailChange).toHaveBeenCalledWith("change-secret");
      await fireEvent.press(screen.getByRole("button", { name: "Continuar" }));
      expect(screen.queryByText("Correo confirmado")).not.toBeOnTheScreen();
    },
  );
});
