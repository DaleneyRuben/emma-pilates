import { fireEvent, render } from "@testing-library/react-native";

import { AuthenticationApiError, type AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";
import { CheckEmailScreen } from "./pending-registration-screens";

function createApiMock(overrides: Partial<AuthenticationApi> = {}): AuthenticationApi {
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
  await fireEvent.changeText(screen.getByLabelText("Celular"), "70712345");
  await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "pilates2026");
  await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
  return screen;
}

describe("Revisa tu correo (01)", () => {
  // Walkthrough 2026-11-04 n.º 18 (DES-012, proposal A «Lo esencial»): the
  // address, one line of what to do and two buttons; the rest in a sheet.
  it("says where the link went and what to do, in two lines", async () => {
    const screen = await registerAndCheckEmail(createApiMock());

    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
    expect(screen.getByText("Te enviamos un enlace a")).toBeOnTheScreen();
    expect(screen.getByText("lucia.mendosa@example.com")).toBeOnTheScreen();
    expect(
      screen.getByText("Ábrelo para activar tu cuenta y después inicia sesión."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/7 días/)).toBeNull();
    expect(screen.queryByText(/Si el registro puede continuar/)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByRole("button", { name: "Regístrate" })).toBeOnTheScreen();
  });

  it("keeps the deadlines, the correction and the cancellation in the options sheet", async () => {
    const screen = await registerAndCheckEmail(createApiMock());

    await fireEvent.press(screen.getByRole("button", { name: "¿Correo equivocado? Ver opciones" }));

    expect(screen.getByText("Opciones")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar correo" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar registro" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "El enlace vence en 24 horas. Si no lo abres en 7 días, borramos el registro.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("Opciones")).toBeNull();
  });

  it("confirms a resend and names only the newest link", async () => {
    const api = createApiMock();
    const screen = await registerAndCheckEmail(api);

    await fireEvent.press(screen.getByRole("button", { name: "Reenviar correo" }));

    expect(api.resendRegistrationVerification).toHaveBeenCalledWith("continuation");
    expect(
      screen.getByText("Te enviamos otro correo. Usa el enlace más reciente."),
    ).toBeOnTheScreen();
  });

  it("shows a device or network limit with the server wait", async () => {
    const api = createApiMock({
      resendRegistrationVerification: jest
        .fn()
        .mockRejectedValue(new AuthenticationApiError("limited", 429, "rate_limit_exceeded", 45)),
    });
    const screen = await registerAndCheckEmail(api);

    await fireEvent.press(screen.getByRole("button", { name: "Reenviar correo" }));

    expect(
      screen.getByRole("alert", {
        name: "Ya te enviamos uno hace poco. El enlace que tienes sigue sirviendo.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás reenviarlo en 0:45.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reenviar en 0:45" })).toBeDisabled();
  });

  it("asks before cancelling the registration", async () => {
    const api = createApiMock();
    const screen = await registerAndCheckEmail(api);
    const openOptions = () =>
      fireEvent.press(screen.getByRole("button", { name: "¿Correo equivocado? Ver opciones" }));

    await openOptions();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar registro" }));
    expect(screen.getByText("¿Cancelar tu registro?")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "El enlace deja de funcionar y el correo queda libre para registrarte de nuevo.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(api.cancelRegistration).not.toHaveBeenCalled();

    await openOptions();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar registro" }));
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar registro" }));

    expect(api.cancelRegistration).toHaveBeenCalledWith("continuation");
    expect(screen.getByRole("button", { name: "Regístrate" })).toBeOnTheScreen();
  });

  it("corrects the address from the options sheet", async () => {
    const api = createApiMock();
    const screen = await registerAndCheckEmail(api);

    await fireEvent.press(screen.getByRole("button", { name: "¿Correo equivocado? Ver opciones" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar correo" }));

    expect(
      screen.getByText("Escribe el correo correcto y te enviamos un enlace nuevo."),
    ).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "lucia.mendoza@example.com",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(api.correctRegistrationEmail).toHaveBeenCalledWith({
      email: "lucia.mendoza@example.com",
      registrationContinuation: "continuation",
    });
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
    await fireEvent.press(screen.getByRole("button", { name: "Registrarme de nuevo" }));
    expect(onRegisterAgain).toHaveBeenCalled();
  });
});
