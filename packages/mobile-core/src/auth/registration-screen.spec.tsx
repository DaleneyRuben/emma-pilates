import { act, fireEvent, render } from "@testing-library/react-native";
import { Keyboard } from "react-native";

import { AuthenticationApiError, type AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(overrides: Partial<AuthenticationApi> = {}): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    register: jest.fn().mockResolvedValue({
      email: "lucia@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    }),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
    ...overrides,
  } as AuthenticationApi;
}

async function openRegistration(api: AuthenticationApi) {
  const screen = await render(<AuthenticationFlow api={api} />);
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  return screen;
}

async function fillForm(
  screen: Awaited<ReturnType<typeof openRegistration>>,
  confirmation = "pilates2026",
) {
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");
  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "lucia@example.com");
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "pilates2026");
  await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), confirmation);
  await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
}

describe("Client registration (01)", () => {
  it("draws the designed fields, button, and way back to Login", async () => {
    const screen = await openRegistration(createApiMock());

    expect(screen.getByPlaceholderText("Tu nombre y apellido")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Mínimo 8 caracteres")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Repite la contraseña")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeOnTheScreen();
    expect(screen.getByText("¿Ya tienes una cuenta?")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Inicia sesión" }));

    expect(screen.getByRole("button", { name: "Regístrate" })).toBeOnTheScreen();
  });

  it("reports a mismatched confirmation under the field and sends nothing", async () => {
    const api = createApiMock();
    const screen = await openRegistration(api);

    await fillForm(screen, "pilates202");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("alert", { name: "Las contraseñas no coinciden." })).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("asks for at least eight characters, as the placeholder says", async () => {
    const api = createApiMock();
    const screen = await openRegistration(api);

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "lucia@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "corta");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "corta");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("alert", { name: "Mínimo 8 caracteres." })).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("keeps the referral code collapsed and sends it once opened", async () => {
    const api = createApiMock();
    const screen = await openRegistration(api);

    expect(screen.queryByLabelText("Código de referido")).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "¿Tienes un código de referido?" }));
    await fireEvent.changeText(screen.getByLabelText("Código de referido"), " EMMA-2026 ");
    await fillForm(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(api.register).toHaveBeenCalledWith({
      acquisitionChannel: "instagram",
      email: "lucia@example.com",
      name: "Lucía Mendoza",
      password: "pilates2026",
      referralCode: "EMMA-2026",
    });
    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
  });

  it("points at the referral code when the server does not know it", async () => {
    const api = createApiMock({
      register: jest.fn().mockRejectedValue(
        Object.assign(new Error("Client registration failed with 422"), {
          code: "referral_code_invalid",
        }),
      ),
    });
    const screen = await openRegistration(api);

    await fireEvent.press(screen.getByRole("button", { name: "¿Tienes un código de referido?" }));
    await fireEvent.changeText(screen.getByLabelText("Código de referido"), "NADIE");
    await fillForm(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("alert", { name: "Revisa el código de referido." })).toBeOnTheScreen();
  });
});

// BKM-011: «¿Cómo nos conociste?» is required on every new registration.
describe("Client registration (01) acquisition channel", () => {
  it("offers the eight answers and sends the one she picks", async () => {
    const api = createApiMock();
    const screen = await openRegistration(api);

    expect(screen.getByText("¿Cómo nos conociste?")).toBeOnTheScreen();
    expect(screen.getAllByRole("radio").map((option) => option.props.accessibilityLabel)).toEqual([
      "Instagram",
      "TikTok",
      "Facebook",
      "Google",
      "Recomendación de una amiga",
      "Una instructora",
      "Pasé por el estudio",
      "Otro",
    ]);
    await fillForm(screen);
    await fireEvent.press(screen.getByRole("radio", { name: "Pasé por el estudio" }));

    expect(screen.getByRole("radio", { name: "Pasé por el estudio" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Instagram" })).not.toBeChecked();
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(api.register).toHaveBeenCalledWith(
      expect.objectContaining({ acquisitionChannel: "walk_in" }),
    );
  });

  it("asks for an answer before creating the account", async () => {
    const api = createApiMock();
    const screen = await openRegistration(api);

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "lucia@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "pilates2026");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "pilates2026");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("alert", { name: "Elige cómo nos conociste." })).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("closes the keyboard when she picks an answer, so «Crear cuenta» shows", async () => {
    const dismiss = jest.spyOn(Keyboard, "dismiss");
    const screen = await openRegistration(createApiMock());

    await fireEvent.press(screen.getByRole("radio", { name: "Google" }));

    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  it("says the code can be a friend's or the instructor's", async () => {
    const screen = await openRegistration(createApiMock());

    await fireEvent.press(screen.getByRole("button", { name: "¿Tienes un código de referido?" }));

    expect(screen.getByText("De una amiga o de tu instructora.")).toBeOnTheScreen();
  });
});

describe("Client registration (01) under the device or network limit", () => {
  const limited = (seconds: number) =>
    createApiMock({
      register: jest
        .fn()
        .mockRejectedValue(
          new AuthenticationApiError(
            "Client registration failed with 429",
            429,
            "authentication_email_throttled",
            seconds,
          ),
        ),
    });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the neutral notice with the server wait instead of the generic failure", async () => {
    const screen = await openRegistration(limited(896));

    await fillForm(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      screen.getByRole("alert", {
        name: "Demasiadas solicitudes. Intenta de nuevo en un momento; si ya recibiste un enlace, sigue sirviendo.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás intentarlo en 14:56.")).toBeOnTheScreen();
    expect(
      screen.getByTestId("wait-notice-clock", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("No pudimos crear la cuenta. Inténtalo de nuevo."),
    ).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeDisabled();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Lucía Mendoza");
  });

  it("enables «Crear cuenta» again once the wait ends", async () => {
    jest.useFakeTimers();
    const api = limited(2);
    const screen = await openRegistration(api);

    await fillForm(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(screen.getByText("Podrás intentarlo en 0:02.")).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("Podrás intentarlo en 0:01.")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    expect(screen.queryByText(/Podrás intentarlo en/)).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
  });
});
