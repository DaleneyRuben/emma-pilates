import { fireEvent, render } from "@testing-library/react-native";

import { AuthenticationApiError, type AuthenticationApi } from "./authentication-api";
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
      email: "lucia.mendosa@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    }),
    requestPasswordRecovery: jest.fn().mockResolvedValue({ status: "accepted" }),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn(),
    ...overrides,
  } as AuthenticationApi;
}

async function openRecovery(api: AuthenticationApi, staff: boolean) {
  const screen = await render(
    <AuthenticationFlow allowClientRegistration={!staff} api={api} />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }),
  );
  return screen;
}

async function sendLink(screen: Awaited<ReturnType<typeof openRecovery>>) {
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "ana.paz@example.com",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Enviar enlace" }));
}

function expectTopBar(
  screen: Awaited<ReturnType<typeof openRecovery>>,
  title: string,
) {
  expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
  expect(screen.queryByText("← Volver")).toBeNull();
}

describe.each([
  ["Client 20", false],
  ["Staff S18", true],
])("Recuperar contraseña top bar (%s)", (_label, staff) => {
  it("titles the form and goes back to Login from the chevron", async () => {
    const screen = await openRecovery(createApiMock(), staff);

    expectTopBar(screen, "Recuperar contraseña");
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));

    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });

  it("keeps the bar on «Revisa tu correo» after sending", async () => {
    const screen = await openRecovery(createApiMock(), staff);

    await sendLink(screen);

    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
    expectTopBar(screen, "Recuperar contraseña");
  });

  it("keeps the bar on the device or network limit", async () => {
    const api = createApiMock({
      requestPasswordRecovery: jest
        .fn()
        .mockRejectedValue(
          new AuthenticationApiError("limited", 429, "rate_limit_exceeded", 52),
        ),
    });
    const screen = await openRecovery(api, staff);

    await sendLink(screen);

    expect(screen.getByText("Podrás pedirlo en 0:52.")).toBeOnTheScreen();
    expectTopBar(screen, "Recuperar contraseña");
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });
});

describe("Cambiar correo top bar (01)", () => {
  it("titles the correction in the bar and returns to «Revisa tu correo»", async () => {
    const screen = await render(<AuthenticationFlow api={createApiMock()} />);
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
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar correo" }));

    expectTopBar(screen, "Cambiar correo");
    await fireEvent.press(screen.getAllByRole("button", { name: "Volver" })[0]);

    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
  });
});
