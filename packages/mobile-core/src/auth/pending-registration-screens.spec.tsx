import { fireEvent, render } from "@testing-library/react-native";

import { AuthenticationApiError, type AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";
import { CheckEmailScreen } from "./pending-registration-screens";

function createApiMock(
  overrides: Partial<AuthenticationApi> = {},
): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn().mockResolvedValue(undefined),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn().mockResolvedValue({
      email: "lucia.mendoza@example.com",
      status: "verification_required",
    }),
    inspectLink: jest.fn(),
    register: jest.fn().mockResolvedValue({
      email: "lucia.mendosa@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    }),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest
      .fn()
      .mockResolvedValue({ status: "verification_required" }),
    verifyClientEmail: jest.fn(),
    ...overrides,
  } as AuthenticationApi;
}

async function registerAndCheckEmail(api: AuthenticationApi) {
  const screen = await render(<AuthenticationFlow api={api} />);
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "lucia.mendosa@example.com",
  );
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "pilates2026");
  await fireEvent.changeText(
    screen.getByLabelText("Confirmar contraseña"),
    "pilates2026",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
  return screen;
}

describe("Revisa tu correo (01)", () => {
  it("names the link lifetime and the 7-day cleanup apart", async () => {
    const screen = await registerAndCheckEmail(createApiMock());

    expect(
      screen.getByText(
        "Si el registro puede continuar, enviamos las instrucciones a este correo:",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("lucia.mendosa@example.com")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "El enlace vence en 24 horas; el correo indica la fecha y hora exactas.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Si en 7 días no verificas, corriges el correo ni pides otro envío, el registro pendiente se elimina.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Volver a iniciar sesión" }),
    );
    expect(screen.getByRole("button", { name: "Regístrate" })).toBeOnTheScreen();
  });

  it("answers a resend neutrally and names only the newest link", async () => {
    const api = createApiMock();
    const screen = await registerAndCheckEmail(api);

    await fireEvent.press(screen.getByRole("button", { name: "Reenviar correo" }));

    expect(api.resendRegistrationVerification).toHaveBeenCalledWith(
      "continuation",
    );
    expect(
      screen.getByText(
        "Si el envío está disponible, recibirás un correo nuevo. Solo funciona el enlace más reciente.",
      ),
    ).toBeOnTheScreen();
  });

  it("shows a device or network limit with the server wait", async () => {
    const api = createApiMock({
      resendRegistrationVerification: jest
        .fn()
        .mockRejectedValue(
          new AuthenticationApiError("limited", 429, "rate_limit_exceeded", 45),
        ),
    });
    const screen = await registerAndCheckEmail(api);

    await fireEvent.press(screen.getByRole("button", { name: "Reenviar correo" }));

    expect(
      screen.getByRole("alert", {
        name: "Demasiadas solicitudes. Intenta de nuevo en un momento; el enlace que ya tienes sigue sirviendo.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás reenviarlo en 0:45.")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Reenviar correo" }),
    ).toBeDisabled();
  });

  it("asks before cancelling the registration", async () => {
    const api = createApiMock();
    const screen = await registerAndCheckEmail(api);

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar registro" }));
    expect(screen.getByText("¿Cancelar tu registro?")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(api.cancelRegistration).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar registro" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Sí, cancelar registro" }),
    );

    expect(api.cancelRegistration).toHaveBeenCalledWith("continuation");
    expect(screen.getByRole("button", { name: "Regístrate" })).toBeOnTheScreen();
  });

  it("explains that a correction stops the links sent to the old address", async () => {
    const api = createApiMock();
    const screen = await registerAndCheckEmail(api);

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar correo" }));

    expect(
      screen.getByText(
        "Escribe el correo correcto. Te enviaremos un enlace nuevo de 24 horas y los enlaces enviados a lucia.mendosa@example.com dejarán de funcionar.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "lucia.mendoza@example.com",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Guardar correo" }));

    expect(screen.getByText("lucia.mendoza@example.com")).toBeOnTheScreen();
  });

  it("says the registration lapsed once its 7-day window has passed", async () => {
    const onRegisterAgain = jest.fn();
    const screen = await render(
      <CheckEmailScreen
        api={createApiMock()}
        onBack={jest.fn()}
        onCancelled={jest.fn()}
        onCorrect={jest.fn()}
        onRegisterAgain={onRegisterAgain}
        onResent={jest.fn()}
        pending={{
          email: "lucia@example.com",
          pendingExpiresAt: Date.now() - 1_000,
          registrationContinuation: "continuation",
        }}
      />,
    );

    expect(screen.getByText("El registro venció")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Pasaron 7 días sin verificar el correo, así que eliminamos el registro pendiente. Puedes registrarte de nuevo.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Registrarme de nuevo" }),
    );
    expect(onRegisterAgain).toHaveBeenCalled();
  });
});
