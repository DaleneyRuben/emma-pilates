import { fireEvent, render } from "@testing-library/react-native";

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
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "lucia@example.com",
  );
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "pilates2026");
  await fireEvent.changeText(
    screen.getByLabelText("Confirmar contraseña"),
    confirmation,
  );
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

    expect(
      screen.getByRole("alert", { name: "Las contraseñas no coinciden." }),
    ).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("asks for at least eight characters, as the placeholder says", async () => {
    const api = createApiMock();
    const screen = await openRegistration(api);

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "lucia@example.com",
    );
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "corta");
    await fireEvent.changeText(
      screen.getByLabelText("Confirmar contraseña"),
      "corta",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      screen.getByRole("alert", { name: "Mínimo 8 caracteres." }),
    ).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("keeps the referral code collapsed and sends it once opened", async () => {
    const api = createApiMock();
    const screen = await openRegistration(api);

    expect(screen.queryByLabelText("Código de referido")).not.toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "¿Tienes un código de referido?" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Código de referido"),
      " EMMA-2026 ",
    );
    await fillForm(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(api.register).toHaveBeenCalledWith({
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

    await fireEvent.press(
      screen.getByRole("button", { name: "¿Tienes un código de referido?" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Código de referido"),
      "NADIE",
    );
    await fillForm(screen);
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      screen.getByRole("alert", { name: "Revisa el código de referido." }),
    ).toBeOnTheScreen();
  });
});
