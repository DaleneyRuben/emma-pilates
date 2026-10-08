import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";
import type { PendingRegistration } from "./pending-registration-screens";

// MOB-028: «Revisa tu correo» and «El registro venció» survive a restart.
const day = 24 * 60 * 60 * 1_000;

function createApiMock(overrides: Partial<AuthenticationApi> = {}): AuthenticationApi {
  return {
    activateAccount: jest.fn(),
    cancelRegistration: jest.fn().mockResolvedValue(undefined),
    completePasswordRecovery: jest.fn(),
    correctRegistrationEmail: jest.fn(),
    inspectLink: jest.fn(),
    register: jest.fn().mockResolvedValue({
      email: "ana@example.com",
      registrationContinuation: "continuation",
      status: "verification_required",
    }),
    requestPasswordRecovery: jest.fn(),
    resendRegistrationVerification: jest.fn(),
    verifyClientEmail: jest.fn().mockResolvedValue({ status: "verified" }),
    ...overrides,
  } as AuthenticationApi;
}

function createStore(stored: PendingRegistration | null = null) {
  let value = stored;
  return {
    clear: jest.fn(async () => {
      value = null;
    }),
    load: jest.fn(async () => value),
    save: jest.fn(async (pending: PendingRegistration) => {
      value = pending;
    }),
    current: () => value,
  };
}

const stored = (expiresInMilliseconds: number): PendingRegistration => ({
  email: "ana@example.com",
  pendingExpiresAt: Date.now() + expiresInMilliseconds,
  registrationContinuation: "continuation",
});

describe("AuthenticationFlow pending registration across launches", () => {
  it("opens «Revisa tu correo» for a registration kept from an earlier launch", async () => {
    const store = createStore(stored(3 * day));
    const screen = await render(
      <AuthenticationFlow api={createApiMock()} pendingRegistrationStore={store} />,
    );

    expect(await screen.findByText("Revisa tu correo")).toBeOnTheScreen();
    expect(screen.getByText("ana@example.com")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Iniciar sesión")).not.toBeOnTheScreen();
  });

  it("says the registration lapsed once, then forgets it", async () => {
    const store = createStore(stored(-1));
    const screen = await render(
      <AuthenticationFlow api={createApiMock()} pendingRegistrationStore={store} />,
    );

    expect(await screen.findByText("El registro venció")).toBeOnTheScreen();
    expect(store.clear).toHaveBeenCalled();
  });

  // MOB-052: the restore runs once per launch; a re-render in the meantime
  // (every render hands the hook a new `onRestored`) must neither restart it
  // nor discard its result.
  it("restores once however often the flow re-renders meanwhile", async () => {
    let release: (kept: PendingRegistration | null) => void = () => undefined;
    const store = createStore(stored(3 * day));
    store.load.mockImplementation(
      () =>
        new Promise<PendingRegistration | null>((resolve) => {
          release = resolve;
        }),
    );
    const api = createApiMock();
    const screen = await render(<AuthenticationFlow api={api} pendingRegistrationStore={store} />);

    expect(screen.toJSON()).toBeNull();
    await screen.rerender(
      <AuthenticationFlow api={api} notice="Hasta pronto." pendingRegistrationStore={store} />,
    );
    release(store.current());

    expect(await screen.findByText("Revisa tu correo")).toBeOnTheScreen();
    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it("keeps a new registration and forgets it when she cancels", async () => {
    const store = createStore();
    const screen = await render(
      <AuthenticationFlow api={createApiMock()} pendingRegistrationStore={store} />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Regístrate" }));
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Clienta");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "password");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "password");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(store.current()).toMatchObject({
        email: "ana@example.com",
        registrationContinuation: "continuation",
      });
    });

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar registro" }));
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar registro" }));

    await waitFor(() => {
      expect(store.current()).toBeNull();
    });
  });

  it("forgets it once the email is verified", async () => {
    const store = createStore(stored(3 * day));
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock()}
        intent={{ token: "verification-token", type: "verify-email" }}
        pendingRegistrationStore={store}
      />,
    );

    expect(await screen.findByText("Correo verificado")).toBeOnTheScreen();
    await waitFor(() => {
      expect(store.current()).toBeNull();
    });
  });

  it("forgets it after a successful login, but not after a rejected one", async () => {
    const store = createStore(stored(3 * day));
    const onLogin = jest
      .fn()
      .mockResolvedValueOnce({ status: "rejected" })
      .mockResolvedValueOnce(undefined);
    const screen = await render(
      <AuthenticationFlow
        api={createApiMock()}
        onLogin={onLogin}
        pendingRegistrationStore={store}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Volver a iniciar sesión" }));
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "password");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(store.current()).not.toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => {
      expect(store.current()).toBeNull();
    });
  });
});
