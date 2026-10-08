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

describe("AuthenticationFlow", () => {
  it("keeps Client registration out of the Staff authentication flow", async () => {
    const screen = await render(
      <AuthenticationFlow allowClientRegistration={false} api={createApiMock()} />,
    );

    expect(screen.queryByRole("button", { name: "Regístrate" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" })).toBeOnTheScreen();
  });

  it("registers a Client and shows the pending email actions", async () => {
    const register = jest.fn().mockResolvedValue({
      email: "ana@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    });
    const screen = await render(<AuthenticationFlow api={createApiMock({ register })} />);

    await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Clienta");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "local password");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "local password");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(register).toHaveBeenCalledWith({
      email: "ana@example.com",
      name: "Ana Clienta",
      password: "local password",
    });
    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
    expect(screen.getByText("ana@example.com")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar correo" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reenviar correo" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar registro" })).toBeOnTheScreen();
  });

  it("corrects, resends, and cancels a pending registration", async () => {
    const register = jest.fn().mockResolvedValue({
      email: "ana@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    });
    const correctRegistrationEmail = jest.fn().mockResolvedValue({
      email: "ana.corrected@example.com",
      status: "verification_required",
    });
    const resendRegistrationVerification = jest
      .fn()
      .mockResolvedValue({ status: "verification_required" });
    const cancelRegistration = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({
          cancelRegistration,
          correctRegistrationEmail,
          register,
          resendRegistrationVerification,
        })}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Clienta");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "password");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "password");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar correo" }));
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "ana.corrected@example.com",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar correo" }));

    expect(correctRegistrationEmail).toHaveBeenCalledWith({
      email: "ana.corrected@example.com",
      registrationContinuation: "continuation",
    });
    expect(screen.getByText("ana.corrected@example.com")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reenviar correo" }));
    expect(resendRegistrationVerification).toHaveBeenCalledWith("continuation");
    expect(screen.getByText(/Si el envío está disponible/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar registro" }));
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar registro" }));
    expect(cancelRegistration).toHaveBeenCalledWith("continuation");
    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });

  it("requests password recovery without revealing Account existence", async () => {
    const requestPasswordRecovery = jest.fn().mockResolvedValue({ status: "accepted" });
    const screen = await render(
      <AuthenticationFlow api={createApiMock({ requestPasswordRecovery })} />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
    expect(screen.getByText(/Si hay una cuenta con ana@example.com/)).toBeOnTheScreen();
  });

  it("verifies a Client email link and returns to Login", async () => {
    const verifyClientEmail = jest.fn().mockResolvedValue({ status: "verified" });
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ verifyClientEmail })}
        intent={{ token: "verification-token", type: "verify-email" }}
      />,
    );

    await waitFor(() => {
      expect(verifyClientEmail).toHaveBeenCalledWith("verification-token");
      expect(screen.getByText("Correo verificado")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Ir a iniciar sesión" }));

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });

  it("opens a verified link received while Login is already visible", async () => {
    const verifyClientEmail = jest.fn().mockResolvedValue({ status: "verified" });
    const api = createApiMock({ verifyClientEmail });
    const screen = await render(<AuthenticationFlow api={api} />);

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();

    await screen.rerender(
      <AuthenticationFlow api={api} intent={{ token: "live-token", type: "verify-email" }} />,
    );

    await waitFor(() => {
      expect(verifyClientEmail).toHaveBeenCalledWith("live-token");
      expect(screen.getByText("Correo verificado")).toBeOnTheScreen();
    });
  });

  // MOB-052: `onVerified` is a new closure on every render of the flow and the
  // token is consumed by the first call, so the verification must not follow it.
  it("verifies the token once however often the flow re-renders", async () => {
    const verifyClientEmail = jest.fn().mockResolvedValue({ status: "verified" });
    const api = createApiMock({ verifyClientEmail });
    const intent = { token: "verification-token", type: "verify-email" } as const;
    const screen = await render(<AuthenticationFlow api={api} intent={intent} />);

    await waitFor(() => {
      expect(screen.getByText("Correo verificado")).toBeOnTheScreen();
    });
    await screen.rerender(<AuthenticationFlow api={api} intent={intent} notice="Hasta pronto." />);
    await screen.rerender(<AuthenticationFlow api={api} intent={intent} notice={null} />);

    expect(verifyClientEmail).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Correo verificado")).toBeOnTheScreen();
  });

  it("starts the replacement Session after password recovery", async () => {
    const inspectLink = jest.fn().mockResolvedValue({
      purpose: "password_recovery",
      status: "current",
    });
    const completePasswordRecovery = jest.fn().mockResolvedValue({
      credential: "replacement-credential",
      status: "recovered",
    });
    const startRecoveredSession = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ completePasswordRecovery, inspectLink })}
        intent={{ token: "recovery-token", type: "recover-password" }}
        onRecoveryCredential={startRecoveredSession}
      />,
    );

    await waitFor(() => {
      expect(inspectLink).toHaveBeenCalledWith("recovery-token");
      expect(screen.getByLabelText("Contraseña nueva")).toBeOnTheScreen();
    });

    await fireEvent.changeText(screen.getByLabelText("Contraseña nueva"), "replacement password");
    await fireEvent.changeText(
      screen.getByLabelText("Confirmar contraseña"),
      "replacement password",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar contraseña" })).not.toBeDisabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(startRecoveredSession).toHaveBeenCalled());
    expect(completePasswordRecovery).toHaveBeenCalledWith({
      password: "replacement password",
      token: "recovery-token",
    });
    expect(startRecoveredSession).toHaveBeenCalledWith("replacement-credential");
  });

  it("activates an Account without creating a Session", async () => {
    const inspectLink = jest.fn().mockResolvedValue({
      purpose: "activation",
      status: "current",
    });
    const activateAccount = jest.fn().mockResolvedValue({ status: "activated" });
    const startRecoveredSession = jest.fn();
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ activateAccount, inspectLink })}
        intent={{ token: "activation-token", type: "activate-account" }}
        onRecoveryCredential={startRecoveredSession}
      />,
    );

    await waitFor(() => {
      expect(inspectLink).toHaveBeenCalledWith("activation-token");
      expect(screen.getByLabelText("Contraseña nueva")).toBeOnTheScreen();
    });

    await fireEvent.changeText(screen.getByLabelText("Contraseña nueva"), "new password");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "new password");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Activar cuenta" })).not.toBeDisabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Activar cuenta" }));

    expect(await screen.findByText("Tu cuenta está activa")).toBeOnTheScreen();
    expect(activateAccount).toHaveBeenCalledWith({
      password: "new password",
      token: "activation-token",
    });
    expect(startRecoveredSession).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Ir a iniciar sesión" }));
    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });

  it("rejects an expired password link before asking for a password", async () => {
    const inspectLink = jest.fn().mockResolvedValue({ status: "expired" });
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ inspectLink })}
        intent={{ token: "expired-token", type: "recover-password" }}
      />,
    );

    await waitFor(() => {
      expect(inspectLink).toHaveBeenCalledWith("expired-token");
      expect(screen.getByText("Este enlace ya no es válido")).toBeOnTheScreen();
    });
    expect(screen.queryByLabelText("Contraseña nueva")).not.toBeOnTheScreen();
  });
});
