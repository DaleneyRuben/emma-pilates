import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { LoginScreen, type BiometricLock } from "./login-screen";

const hidden = { includeHiddenElements: true };

function lock(overrides: Partial<BiometricLock> = {}): BiometricLock {
  return {
    autoPrompt: false,
    error: null,
    onUnlock: jest.fn(),
    onUseAnotherAccount: jest.fn(),
    ...overrides,
  };
}

// Owner, 2026-11-23 (canvas Main, B, C; iOS-1 to iOS-3): the launch asks for
// Face ID or the fingerprint over the bare logo; cancelling greets with
// «Hola de nuevo», whose second way out is another Account.
describe("LoginScreen with biometrics on", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens the prompt by itself over the bare logo, once", async () => {
    let finish: () => void = () => undefined;
    const onUnlock = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const screen = await render(
      <LoginScreen biometricLock={lock({ autoPrompt: true, onUnlock })} onSubmit={jest.fn()} />,
    );

    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("login-hero")).toBeOnTheScreen();
    expect(screen.queryByTestId("login-sheet")).toBeNull();

    await act(async () => finish());

    expect(screen.getByText("Hola de nuevo")).toBeOnTheScreen();
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("greets and unlocks with Face ID without the form", async () => {
    const biometricLock = lock();
    const screen = await render(
      <LoginScreen
        biometricLock={biometricLock}
        onForgotPassword={jest.fn()}
        onRegister={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole("header", { name: "Hola de nuevo" })).toBeOnTheScreen();
    expect(screen.getByTestId("glyph-faceId", hidden)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Correo electrónico")).toBeNull();
    expect(screen.queryByText("Regístrate")).toBeNull();
    expect(screen.queryByText(/quita la huella/)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Entrar con Face ID" }));
    expect(biometricLock.onUnlock).toHaveBeenCalledTimes(1);
  });

  it("names the fingerprint on Android and says what «Usar otra cuenta» does", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const screen = await render(<LoginScreen biometricLock={lock()} onSubmit={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Entrar con tu huella" })).toBeOnTheScreen();
    expect(screen.getByTestId("glyph-fingerprint", hidden)).toBeOnTheScreen();
    expect(
      screen.getByText("«Usar otra cuenta» quita la huella de este celular."),
    ).toBeOnTheScreen();
  });

  it("hands «Usar otra cuenta» to the identity", async () => {
    const biometricLock = lock();
    const screen = await render(<LoginScreen biometricLock={biometricLock} onSubmit={jest.fn()} />);

    await fireEvent.press(screen.getByRole("button", { name: "Usar otra cuenta" }));

    expect(biometricLock.onUseAnotherAccount).toHaveBeenCalledTimes(1);
    expect(biometricLock.onUnlock).not.toHaveBeenCalled();
  });

  it("says why it could not sign in after a successful scan", async () => {
    const screen = await render(
      <LoginScreen
        biometricLock={lock({
          error: "No pudimos entrar. Revisa tu conexión e intenta de nuevo.",
        })}
        onSubmit={jest.fn()}
      />,
    );

    expect(
      screen.getByText("No pudimos entrar. Revisa tu conexión e intenta de nuevo."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Entrar con Face ID" })).toBeOnTheScreen();
  });

  it("keeps the plain form without biometrics", async () => {
    const screen = await render(<LoginScreen onSubmit={jest.fn()} />);

    expect(screen.queryByText("Hola de nuevo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Usar otra cuenta" })).toBeNull();
    expect(screen.getByLabelText("Correo electrónico")).toBeOnTheScreen();
  });
});
