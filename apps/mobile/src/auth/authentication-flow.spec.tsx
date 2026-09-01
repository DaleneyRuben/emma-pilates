import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(
  overrides: Partial<AuthenticationApi> = {},
): AuthenticationApi {
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
  it("registers a Client and shows the pending email actions", async () => {
    const register = jest.fn().mockResolvedValue({
      email: "ana@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    });
    const screen = await render(
      <AuthenticationFlow api={createApiMock({ register })} />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Crear cuenta" }),
    );
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Clienta");
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Contraseña"),
      "local password",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Confirmar contraseña"),
      "local password",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Registrar cuenta" }),
    );

    expect(register).toHaveBeenCalledWith({
      email: "ana@example.com",
      name: "Ana Clienta",
      password: "local password",
    });
    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
    expect(screen.getByText("ana@example.com")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Cambiar correo" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Reenviar correo" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Cancelar registro" }),
    ).toBeOnTheScreen();
  });

  it("requests password recovery without revealing Account existence", async () => {
    const requestPasswordRecovery = jest
      .fn()
      .mockResolvedValue({ status: "accepted" });
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ requestPasswordRecovery })}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Olvidé mi contraseña" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "ana@example.com",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Enviar enlace" }),
    );

    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
    expect(
      screen.getByText(/Si existe una cuenta con ese correo/),
    ).toBeOnTheScreen();
  });

  it("verifies a Client email link and returns to Login", async () => {
    const verifyClientEmail = jest
      .fn()
      .mockResolvedValue({ status: "verified" });
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
    await fireEvent.press(
      screen.getByRole("button", { name: "Ir a iniciar sesión" }),
    );

    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });

  it("starts the replacement Session after password recovery", async () => {
    const completePasswordRecovery = jest.fn().mockResolvedValue({
      credential: "replacement-credential",
      status: "recovered",
    });
    const startRecoveredSession = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ completePasswordRecovery })}
        intent={{ token: "recovery-token", type: "recover-password" }}
        onRecoveryCredential={startRecoveredSession}
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText("Nueva contraseña"),
      "replacement password",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Confirmar contraseña"),
      "replacement password",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Restablecer contraseña" }),
    );

    expect(completePasswordRecovery).toHaveBeenCalledWith({
      password: "replacement password",
      token: "recovery-token",
    });
    expect(startRecoveredSession).toHaveBeenCalledWith(
      "replacement-credential",
    );
  });

  it("activates an Account without creating a Session", async () => {
    const activateAccount = jest
      .fn()
      .mockResolvedValue({ status: "activated" });
    const startRecoveredSession = jest.fn();
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock({ activateAccount })}
        intent={{ token: "activation-token", type: "activate-account" }}
        onRecoveryCredential={startRecoveredSession}
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText("Nueva contraseña"),
      "new password",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Confirmar contraseña"),
      "new password",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Activar cuenta" }),
    );

    expect(activateAccount).toHaveBeenCalledWith({
      password: "new password",
      token: "activation-token",
    });
    expect(startRecoveredSession).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Iniciar sesión")).toBeOnTheScreen();
  });
});
