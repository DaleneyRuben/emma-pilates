import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";
import type { PendingRegistration } from "./pending-registration-screens";

const day = 24 * 60 * 60 * 1_000;

function createApiMock(overrides: Partial<AuthenticationApi> = {}): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn(),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    lookUpReferralCode: jest.fn(),
    readRegistrationStatus: jest.fn().mockResolvedValue("pending"),
    register: jest.fn(),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest
      .fn()
      .mockResolvedValue({ status: "verification_required" }),
    verifyClientEmail: jest.fn(),
    ...overrides,
  } as AuthenticationApi;
}

function createStore(stored: PendingRegistration | null) {
  let value = stored;
  return {
    clear: jest.fn(async () => {
      value = null;
    }),
    load: jest.fn(async () => value),
    save: jest.fn(async (pending: PendingRegistration) => {
      value = pending;
    }),
  };
}

const carla: PendingRegistration = {
  email: "carla@example.com",
  pendingExpiresAt: Date.now() + 3 * day,
  registrationContinuation: "continuation",
};

async function signIn(screen: Awaited<ReturnType<typeof render>>, email: string) {
  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), email);
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "a password");
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
}

// Walkthrough n.º 4 (C01e2, C01c2): an unconfirmed email is not «wrong», and
// «Revisa tu correo» learns when the email was confirmed elsewhere.
describe("AuthenticationFlow with an unconfirmed registration", () => {
  async function openLogin(api: AuthenticationApi, onLogin = jest.fn()) {
    const store = createStore(carla);
    const screen = await render(
      <AuthenticationFlow api={api} onLogin={onLogin} pendingRegistrationStore={store} />,
    );
    // «Revisa tu correo» leads to Login with its «Iniciar sesión» button.
    await fireEvent.press(await screen.findByRole("button", { name: "Iniciar sesión" }));
    return { screen, store };
  }

  it("says the email is not confirmed yet when the pending address is refused", async () => {
    const api = createApiMock();
    const onLogin = jest.fn().mockResolvedValue({ status: "rejected" });
    const { screen } = await openLogin(api, onLogin);

    await signIn(screen, "Carla@Example.com");

    expect(await screen.findByText("Todavía no confirmaste tu correo")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Te enviamos un enlace a carla@example.com. Ábrelo para activar tu cuenta y después inicia sesión.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("El correo o la contraseña no son correctos.")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Reenviar correo" }));

    await waitFor(() =>
      expect(api.resendRegistrationVerification).toHaveBeenCalledWith("continuation"),
    );
    expect(await screen.findByText("Revisa tu correo")).toBeOnTheScreen();
  });

  it("keeps the generic refusal for any other address", async () => {
    const onLogin = jest.fn().mockResolvedValue({ status: "rejected" });
    const { screen } = await openLogin(createApiMock(), onLogin);

    await signIn(screen, "otra@example.com");

    expect(
      await screen.findByText("El correo o la contraseña no son correctos."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Todavía no confirmaste tu correo")).toBeNull();
  });

  it("leads to Login with a notice once the email was confirmed elsewhere", async () => {
    const api = createApiMock({
      readRegistrationStatus: jest.fn().mockResolvedValue("verified"),
    });
    const store = createStore(carla);
    const screen = await render(
      <AuthenticationFlow api={api} onLogin={jest.fn()} pendingRegistrationStore={store} />,
    );

    expect(
      await screen.findByText("Tu correo ya está confirmado. Inicia sesión para entrar."),
    ).toBeOnTheScreen();
    expect(api.readRegistrationStatus).toHaveBeenCalledWith("continuation");
    expect(screen.queryByText("Revisa tu correo")).toBeNull();
    await waitFor(() => expect(store.clear).toHaveBeenCalled());
  });

  it("stays on «Revisa tu correo» while the email waits or the check fails", async () => {
    const api = createApiMock({
      readRegistrationStatus: jest.fn().mockRejectedValue(new Error("offline")),
    });
    const screen = await render(
      <AuthenticationFlow api={api} pendingRegistrationStore={createStore(carla)} />,
    );

    expect(await screen.findByText("Revisa tu correo")).toBeOnTheScreen();
    await waitFor(() => expect(api.readRegistrationStatus).toHaveBeenCalled());
    expect(screen.getByText("Revisa tu correo")).toBeOnTheScreen();
  });

  // Walkthrough n.º 2 (C01c3): Resend reported the verification email
  // bounced, so the address is wrong; a resend there would bounce again.
  it("says the email bounced and offers to change the address", async () => {
    const api = createApiMock({
      readRegistrationStatus: jest.fn().mockResolvedValue("bounced"),
    });
    const screen = await render(
      <AuthenticationFlow api={api} pendingRegistrationStore={createStore(carla)} />,
    );

    expect(await screen.findByText("El correo rebotó")).toBeOnTheScreen();
    // The notice stands on the screen, not inside the page's white card.
    expect(screen.queryByTestId("authentication-panel")).toBeNull();
    expect(screen.getByTestId("check-email-bounced")).toHaveStyle({
      backgroundColor: "#FEF6F2",
      borderColor: "#CDA697",
      borderRadius: 14,
      borderWidth: 1.5,
      flexDirection: "row",
    });
    expect(
      within(screen.getByTestId("check-email-bounced")).getByTestId("glyph-alert", {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("No pudimos entregar el correo a carla@example.com. Revisa la dirección."),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reenviar correo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Volver a iniciar sesión" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar correo" }));
    expect(
      screen.getByText("Escribe el correo correcto y te enviamos un enlace nuevo."),
    ).toBeOnTheScreen();
  });
});
