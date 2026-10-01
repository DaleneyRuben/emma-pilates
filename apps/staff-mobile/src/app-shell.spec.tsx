import { render, waitFor } from "@testing-library/react-native";

import App from "../App";

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

function createRuntime(role?: "client" | "trainer") {
  return {
    allowedLinkHosts: ["links.emmapilates.test"],
    authenticationApi: createAuthenticationApiMock(),
    linkSource: {
      addEventListener: () => ({ remove: jest.fn() }),
      getInitialURL: async () => null,
    },
    login: jest.fn(),
    sessionManager: {
      endLocally: jest.fn(),
      hasBiometricSession: jest.fn().mockResolvedValue(false),
      logout: jest.fn(),
      restore: jest.fn().mockResolvedValue(
        role === undefined
          ? null
          : { accountId: "account-1", role },
      ),
      start: jest.fn(),
      unlockWithBiometrics: jest.fn(),
    },
  };
}

describe("Staff App", () => {
  it("starts with Staff Login and no Client registration", async () => {
    const screen = await render(<App runtime={createRuntime()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Regístrate" }),
      ).not.toBeOnTheScreen();
    });
  });

  it("restores a Trainer into the Staff navigation", async () => {
    const screen = await render(<App runtime={createRuntime("trainer")} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Mi agenda")).toBeOnTheScreen();
    });
  });

  it("does not render Client navigation", async () => {
    const screen = await render(<App runtime={createRuntime("client")} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Inicio")).not.toBeOnTheScreen();
    });
  });
});
