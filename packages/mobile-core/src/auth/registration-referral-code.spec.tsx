import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(overrides: Partial<AuthenticationApi> = {}): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    lookUpReferralCode: jest.fn(),
    readRegistrationStatus: jest.fn().mockResolvedValue("pending"),
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

async function openWithCode(api: AuthenticationApi, code: string) {
  const screen = await render(<AuthenticationFlow api={api} />);
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Sofía Gómez");
  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "sofia@example.com");
  await fireEvent.changeText(screen.getByLabelText("Celular"), "70712345");
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "pilates2026");
  await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "pilates2026");
  await fireEvent.press(screen.getByRole("radio", { name: "Facebook" }));
  await fireEvent.press(screen.getByRole("button", { name: "¿Tienes un código de referido?" }));
  await fireEvent.changeText(screen.getByLabelText("Código de referido"), code);
  return screen;
}

// Walkthrough n.º 18 (C01b5, C01b6) and n.º 6 (C01b3, C01b4).
describe("«Crea tu cuenta» with a referral code", () => {
  it("shows the real example of a code", async () => {
    const screen = await openWithCode(createApiMock(), "");

    expect(screen.getByText("Ej.: LUCIA")).toBeOnTheScreen();
  });

  it("names a friend's code and marks «Recomendación de una amiga» by itself", async () => {
    const lookUpReferralCode = jest.fn().mockResolvedValue({
      code: "LUCIA",
      holderFirstName: "Lucía",
      holderKind: "client",
      status: "valid",
    });
    const api = createApiMock({ lookUpReferralCode });
    const screen = await openWithCode(api, "lucia");

    expect(await screen.findByText("Código de Lucía")).toBeOnTheScreen();
    expect(lookUpReferralCode).toHaveBeenCalledWith("lucia");
    expect(screen.getByRole("radio", { name: "Recomendación de una amiga" })).toBeChecked();
    expect(screen.getByText("La marcamos por el código de Lucía.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    await waitFor(() =>
      expect(api.register).toHaveBeenCalledWith(
        expect.objectContaining({ acquisitionChannel: "friend", referralCode: "lucia" }),
      ),
    );
  });

  it("marks «Una instructora» for a Trainer's code", async () => {
    const api = createApiMock({
      lookUpReferralCode: jest.fn().mockResolvedValue({
        code: "DANIELA",
        holderFirstName: "Daniela",
        holderKind: "trainer",
        status: "valid",
      }),
    });
    const screen = await openWithCode(api, "DANIELA");

    expect(await screen.findByText("Código de Daniela")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Una instructora" })).toBeChecked();
  });

  it("flags a code that does not exist before creating the account", async () => {
    const api = createApiMock({
      lookUpReferralCode: jest.fn().mockResolvedValue({
        code: "LUCIAA",
        holderFirstName: null,
        holderKind: null,
        status: "unknown",
      }),
    });
    const screen = await openWithCode(api, "luciaa");

    expect(
      await screen.findByText("No encontramos el código LUCIAA. Revisa cómo lo escribiste."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(api.register).not.toHaveBeenCalled();
  });

  it("keeps «¿Tienes un código de referido?» above the open field, its chevron up", async () => {
    const screen = await openWithCode(createApiMock(), "");
    const toggle = screen.getByRole("button", { name: "¿Tienes un código de referido?" });

    expect(toggle).toBeExpanded();
    expect(
      within(toggle).getByTestId("referral-toggle-chevron-up", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("draws a check before «La marcamos por el código de Lucía.» (C01b5)", async () => {
    const api = createApiMock({
      lookUpReferralCode: jest.fn().mockResolvedValue({
        code: "LUCIA",
        holderFirstName: "Lucía",
        holderKind: "client",
        status: "valid",
      }),
    });
    const screen = await openWithCode(api, "lucia");

    await screen.findByText("La marcamos por el código de Lucía.");
    expect(
      screen.getByTestId("acquisition-channel-note-check", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("draws an alert circle before an unknown code's error (C01b6)", async () => {
    const api = createApiMock({
      lookUpReferralCode: jest.fn().mockResolvedValue({
        code: "LUCIAA",
        holderFirstName: null,
        holderKind: null,
        status: "unknown",
      }),
    });
    const screen = await openWithCode(api, "luciaa");

    await screen.findByText("No encontramos el código LUCIAA. Revisa cómo lo escribiste.");
    expect(
      screen.getByTestId("inline-error-icon-alert", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("keeps «Crear cuenta» and the way to Login at the end of the form, never pinned", async () => {
    const screen = await openWithCode(createApiMock(), "");
    const end = screen.getByTestId("auth-actions");

    expect(within(end).getByRole("button", { name: "Crear cuenta" })).toBeOnTheScreen();
    expect(within(end).getByRole("button", { name: /Inicia sesión/ })).toBeOnTheScreen();
  });
});
