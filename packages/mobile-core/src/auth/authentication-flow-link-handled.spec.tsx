import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(overrides: Partial<AuthenticationApi> = {}): AuthenticationApi {
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
    ...overrides,
  } as AuthenticationApi;
}

// Walkthrough n.º 17: the app kept the last link it opened, so signing out
// showed «Enlace no válido» instead of Login. The flow reports each link once
// it is used, and keeps its own outcome on screen after the app clears it.
describe("AuthenticationFlow link handling", () => {
  it("reports a verified email link as handled and keeps its outcome", async () => {
    const verifyClientEmail = jest.fn().mockResolvedValue({ status: "verified" });
    const api = createApiMock({ verifyClientEmail });
    const intent = { token: "verification-token", type: "verify-email" } as const;
    const onIntentHandled = jest.fn();
    const screen = await render(
      <AuthenticationFlow api={api} intent={intent} onIntentHandled={onIntentHandled} />,
    );

    await waitFor(() => expect(onIntentHandled).toHaveBeenCalledWith(intent));
    await screen.rerender(
      <AuthenticationFlow api={api} intent={null} onIntentHandled={onIntentHandled} />,
    );

    expect(screen.getByText("Correo verificado")).toBeOnTheScreen();
    expect(verifyClientEmail).toHaveBeenCalledTimes(1);
  });

  it("reports a used email link as handled", async () => {
    const intent = { token: "used-token", type: "verify-email" } as const;
    const onIntentHandled = jest.fn();
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({
          verifyClientEmail: jest.fn().mockResolvedValue({ status: "invalid" }),
        })}
        intent={intent}
        onIntentHandled={onIntentHandled}
      />,
    );

    await waitFor(() => expect(screen.getByText("Enlace no válido")).toBeOnTheScreen());
    expect(onIntentHandled).toHaveBeenCalledWith(intent);
  });

  it("reports a password link as handled when she leaves it for Login", async () => {
    const intent = { token: "expired-token", type: "activate-account" } as const;
    const onIntentHandled = jest.fn();
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ inspectLink: jest.fn().mockResolvedValue({ status: "expired" }) })}
        intent={intent}
        onIntentHandled={onIntentHandled}
      />,
    );

    await waitFor(() => expect(screen.getByText("Este enlace ya no es válido")).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: "Ir a iniciar sesión" }));

    expect(onIntentHandled).toHaveBeenCalledWith(intent);
    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });

  it("reports a recovery link as handled before starting the recovered Session", async () => {
    const intent = { token: "recovery-token", type: "recover-password" } as const;
    const order: string[] = [];
    const onIntentHandled = jest.fn(() => order.push("handled"));
    const startRecoveredSession = jest.fn(async () => {
      order.push("session");
    });
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({
          completePasswordRecovery: jest
            .fn()
            .mockResolvedValue({ credential: "replacement", status: "recovered" }),
          inspectLink: jest
            .fn()
            .mockResolvedValue({ purpose: "password_recovery", status: "current" }),
        })}
        intent={intent}
        onIntentHandled={onIntentHandled}
        onRecoveryCredential={startRecoveredSession}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText("Contraseña nueva")).toBeOnTheScreen());
    await fireEvent.changeText(screen.getByLabelText("Contraseña nueva"), "replacement password");
    await fireEvent.changeText(
      screen.getByLabelText("Confirmar contraseña"),
      "replacement password",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar contraseña" })).not.toBeDisabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(order).toEqual(["handled", "session"]));
  });

  it("opens Login when it mounts again without a link", async () => {
    const api = createApiMock({
      verifyClientEmail: jest.fn().mockResolvedValue({ status: "verified" }),
    });
    const first = await render(
      <AuthenticationFlow api={api} intent={{ token: "t", type: "verify-email" }} />,
    );
    await waitFor(() => expect(first.getByText("Correo verificado")).toBeOnTheScreen());
    await first.unmount();

    const second = await render(<AuthenticationFlow api={api} intent={null} />);

    expect(second.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });
});
