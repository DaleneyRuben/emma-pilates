import {
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import App from "../App";

describe("App", () => {
  it("starts with the unauthenticated navigation flow", async () => {
    const screen = await render(
      <App
        runtime={{
          allowedLinkHosts: ["links.emmapilates.test"],
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () => null,
          },
          login: jest.fn(),
          sessionManager: {
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
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () => null,
          },
          login,
          sessionManager: {
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

    expect(login).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "local password",
    });
    expect(start).toHaveBeenCalledWith("mobile-credential");
  });

  it("restores an authenticated Account into its Role navigation", async () => {
    const screen = await render(
      <App
        runtime={{
          allowedLinkHosts: ["links.emmapilates.test"],
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () => null,
          },
          login: jest.fn(),
          sessionManager: {
            hasBiometricSession: jest.fn().mockResolvedValue(false),
            logout: jest.fn(),
            restore: jest.fn().mockResolvedValue({
              accountId: "account-1",
              role: "administrator",
            }),
            start: jest.fn(),
            unlockWithBiometrics: jest.fn(),
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Pagos pendientes")).toBeOnTheScreen();
    });
  });
});
