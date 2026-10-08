import { fireEvent, render } from "@testing-library/react-native";

import { AuthenticationApiError, type AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(overrides: Partial<AuthenticationApi> = {}): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    register: jest.fn(),
    requestPasswordRecovery: jest.fn().mockResolvedValue({ status: "accepted" }),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
    ...overrides,
  } as AuthenticationApi;
}

async function requestLink(api: AuthenticationApi, staff = false) {
  const screen = await render(<AuthenticationFlow allowClientRegistration={!staff} api={api} />);
  await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
  return screen;
}

describe("Recuperar contraseña (20, S18)", () => {
  it("confirms neutrally with the address, the 30 minutes, and the spam hint", async () => {
    const api = createApiMock();
    const screen = await requestLink(api);

    expect(
      screen.getByText("Te enviaremos un enlace para restablecer tu contraseña."),
    ).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana.paz@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(api.requestPasswordRecovery).toHaveBeenCalledWith("ana.paz@example.com");
    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Si hay una cuenta con ana.paz@example.com, te enviamos un enlace para restablecer tu contraseña.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("El enlace vence en 30 minutos. Si no llega, revisa tu carpeta de spam."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver a iniciar sesión" }));
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });

  it("goes back to Login from the header arrow", async () => {
    const screen = await requestLink(createApiMock());

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));

    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });

  it("shows a device or network limit with the server wait", async () => {
    const api = createApiMock({
      requestPasswordRecovery: jest
        .fn()
        .mockRejectedValue(new AuthenticationApiError("limited", 429, "rate_limit_exceeded", 52)),
    });
    const screen = await requestLink(api);

    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana.paz@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(
      screen.getByRole("alert", {
        name: "Demasiadas solicitudes. Intenta de nuevo en un momento; si ya recibiste un enlace, sigue sirviendo.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás pedirlo en 0:52.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver a iniciar sesión" })).toBeOnTheScreen();
  });

  it("names the team access on the Staff Login and recovery", async () => {
    const screen = await render(
      <AuthenticationFlow allowClientRegistration={false} api={createApiMock()} />,
    );

    expect(screen.getByText("Acceso del equipo")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    expect(screen.getByText("Acceso del equipo")).toBeOnTheScreen();
  });
});
