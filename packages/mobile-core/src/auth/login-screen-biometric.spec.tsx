import { fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { LoginScreen } from "./login-screen";

const hidden = { includeHiddenElements: true };

// «Opción A»: the next launch with biometrics on greets first and keeps the
// password form one tap away.
describe("LoginScreen with biometrics on", () => {
  it("greets and unlocks with Face ID before showing the form", async () => {
    const onBiometricUnlock = jest.fn();
    const screen = await render(
      <LoginScreen
        onBiometricUnlock={onBiometricUnlock}
        onForgotPassword={jest.fn()}
        onRegister={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByText("Hola de nuevo")).toBeOnTheScreen();
    expect(screen.getByTestId("glyph-fingerprint", hidden)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Correo electrónico")).toBeNull();
    expect(screen.queryByText("Regístrate")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Entrar con Face ID" }));
    expect(onBiometricUnlock).toHaveBeenCalledTimes(1);
  });

  it("reveals the password form on «Usar correo y contraseña»", async () => {
    const screen = await render(
      <LoginScreen
        onBiometricUnlock={jest.fn()}
        onForgotPassword={jest.fn()}
        onRegister={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Usar correo y contraseña" }));

    expect(screen.queryByText("Hola de nuevo")).toBeNull();
    expect(screen.getByLabelText("Correo electrónico")).toBeOnTheScreen();
    expect(screen.getByLabelText("Contraseña")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeOnTheScreen();
    expect(screen.getByText("¿Olvidaste tu contraseña?")).toBeOnTheScreen();
    expect(screen.getByText("Regístrate")).toBeOnTheScreen();
  });

  it("names the fingerprint on Android", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const screen = await render(<LoginScreen onBiometricUnlock={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Entrar con tu huella" })).toBeOnTheScreen();
  });

  it("keeps the plain form without biometrics", async () => {
    const screen = await render(<LoginScreen onSubmit={jest.fn()} />);

    expect(screen.queryByText("Hola de nuevo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Usar correo y contraseña" })).toBeNull();
    expect(screen.getByLabelText("Correo electrónico")).toBeOnTheScreen();
  });
});
