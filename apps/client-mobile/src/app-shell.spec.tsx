import { fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../App";

function createAuthenticationApiMock(overrides = {}) {
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
    ...overrides,
  };
}

describe("Client App", () => {
  it("starts with the unauthenticated navigation flow", async () => {
    const screen = await render(
      <App
        runtime={{
          allowedLinkHosts: ["links.emmapilates.test"],
          linkIdentityKind: "client",
          authenticationApi: createAuthenticationApiMock(),
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () => null,
          },
          login: jest.fn(),
          sessionManager: {
            endLocally: jest.fn(),
        refresh: jest.fn().mockResolvedValue(null),
            hasBiometricSession: jest.fn().mockResolvedValue(false),
            logout: jest.fn(),
            restore: jest.fn().mockResolvedValue(null),
            start: jest.fn(),
            unlockWithBiometrics: jest.fn(),
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    });
  });

  it("starts the returned mobile Session after a successful Login", async () => {
    const login = jest.fn().mockResolvedValue({
      credential: "mobile-credential",
      status: "created",
    });
    const start = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <App
        runtime={{
          allowedLinkHosts: ["links.emmapilates.test"],
          linkIdentityKind: "client",
          authenticationApi: createAuthenticationApiMock(),
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () => null,
          },
          login,
          sessionManager: {
            endLocally: jest.fn(),
        refresh: jest.fn().mockResolvedValue(null),
            hasBiometricSession: jest.fn().mockResolvedValue(false),
            logout: jest.fn(),
            restore: jest.fn().mockResolvedValue(null),
            start,
            unlockWithBiometrics: jest.fn(),
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
    });
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "local password");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(login).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "local password",
    });
    expect(start).toHaveBeenCalledWith("mobile-credential");
  });

  it("routes a verified email link into the authentication flow", async () => {
    const verifyClientEmail = jest.fn().mockResolvedValue({ status: "verified" });
    const screen = await render(
      <App
        runtime={{
          allowedLinkHosts: ["links.emmapilates.test"],
          linkIdentityKind: "client",
          authenticationApi: createAuthenticationApiMock({
            verifyClientEmail,
          }),
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () =>
              "https://links.emmapilates.test/client/authentication/verify-email?token=verification-token",
          },
          login: jest.fn(),
          sessionManager: {
            endLocally: jest.fn(),
        refresh: jest.fn().mockResolvedValue(null),
            hasBiometricSession: jest.fn().mockResolvedValue(false),
            logout: jest.fn(),
            restore: jest.fn().mockResolvedValue(null),
            start: jest.fn(),
            unlockWithBiometrics: jest.fn(),
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(verifyClientEmail).toHaveBeenCalledWith("verification-token");
      expect(screen.getByText("Correo verificado")).toBeOnTheScreen();
    });
  });

  it("restores an authenticated Client into the Client navigation", async () => {
    const screen = await render(
      <App
        runtime={{
          allowedLinkHosts: ["links.emmapilates.test"],
          linkIdentityKind: "client",
          authenticationApi: createAuthenticationApiMock(),
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () => null,
          },
          login: jest.fn(),
          sessionManager: {
            endLocally: jest.fn(),
        refresh: jest.fn().mockResolvedValue(null),
            hasBiometricSession: jest.fn().mockResolvedValue(false),
            logout: jest.fn(),
            restore: jest.fn().mockResolvedValue({
              accountId: "account-1",
              role: "client",
            }),
            start: jest.fn(),
            unlockWithBiometrics: jest.fn(),
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Inicio")).toBeOnTheScreen();
    });
  });
});
