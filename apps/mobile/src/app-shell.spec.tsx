import { render, waitFor } from "@testing-library/react-native";

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

  it("restores an authenticated Account into its Role navigation", async () => {
    const screen = await render(
      <App
        runtime={{
          allowedLinkHosts: ["links.emmapilates.test"],
          linkSource: {
            addEventListener: () => ({ remove: jest.fn() }),
            getInitialURL: async () => null,
          },
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
