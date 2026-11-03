import { act, fireEvent, render } from "@testing-library/react-native";
import { BackHandler } from "react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

function createApiMock(): AuthenticationApi {
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
  } as AuthenticationApi;
}

type BackListener = () => boolean | null | undefined;

// The Android back button: the newest listener runs first, as in BackHandler.
function trackBackListeners() {
  const listeners: BackListener[] = [];
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, listener) => {
    listeners.push(listener);
    return {
      remove: () => {
        listeners.splice(listeners.indexOf(listener), 1);
      },
    };
  });
  return {
    press: () => [...listeners].reverse().some((listener) => listener() === true),
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("AuthenticationFlow and the Android back button", () => {
  it("returns from «Recuperar contraseña» to the login instead of closing the app", async () => {
    const back = trackBackListeners();
    const screen = await render(<AuthenticationFlow api={createApiMock()} />);

    await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeOnTheScreen();

    let handled = false;
    await act(async () => {
      handled = back.press();
    });

    expect(handled).toBe(true);
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });

  it("returns from the registration to the login", async () => {
    const back = trackBackListeners();
    const screen = await render(<AuthenticationFlow api={createApiMock()} />);

    await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
    await act(async () => {
      back.press();
    });

    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
  });

  it("leaves the back button to the system on the login", async () => {
    const back = trackBackListeners();
    await render(<AuthenticationFlow api={createApiMock()} />);

    expect(back.press()).toBe(false);
  });
});
