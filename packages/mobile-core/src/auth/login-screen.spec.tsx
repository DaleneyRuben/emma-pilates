import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { LoginScreen } from "./login-screen";

async function submitLogin(onSubmit: jest.Mock) {
  const screen = await render(<LoginScreen onSubmit={onSubmit} />);

  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "local password");
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));

  return screen;
}

describe("LoginScreen", () => {
  it("shows neutral feedback for rejected credentials", async () => {
    const screen = await submitLogin(jest.fn().mockResolvedValue({ status: "rejected" }));

    expect(
      screen.getByRole("alert", {
        name: "El correo o la contraseña no son correctos.",
      }),
    ).toBeOnTheScreen();
  });

  it("uses the server retry time and disables Login when throttled", async () => {
    const screen = await submitLogin(
      jest.fn().mockResolvedValue({
        retryAfterSeconds: 30,
        status: "throttled",
      }),
    );

    expect(
      screen.getByRole("alert", {
        name: "Demasiados intentos. Intenta de nuevo en un momento.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Podrás intentarlo en 0:30.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeDisabled();
  });

  // MOB-060: the button shows it is working while the request is in flight.
  it("shows Iniciar sesión busy while the login is in flight", async () => {
    let answer: (value: { status: "rejected" }) => void = () => undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<{ status: "rejected" }>((resolve) => {
          answer = resolve;
        }),
    );
    const screen = await render(<LoginScreen onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "local password");

    const pressed = fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeBusy();
    });

    answer({ status: "rejected" });
    await pressed;
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).not.toBeBusy();
  });

  it("formats a long server wait as minutes and seconds", async () => {
    const screen = await submitLogin(
      jest.fn().mockResolvedValue({
        retryAfterSeconds: 252,
        status: "throttled",
      }),
    );

    expect(screen.getByText("Podrás intentarlo en 4:12.")).toBeOnTheScreen();
  });

  it("offers recovery and registration with the designed wording", async () => {
    const onForgotPassword = jest.fn();
    const onRegister = jest.fn();
    const screen = await render(
      <LoginScreen onForgotPassword={onForgotPassword} onRegister={onRegister} />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    expect(screen.getByText("¿No tienes una cuenta?")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));

    expect(onForgotPassword).toHaveBeenCalled();
    expect(onRegister).toHaveBeenCalled();
  });

  it("shows the notice left by a closed Account", async () => {
    const screen = await render(
      <LoginScreen notice="Cerramos tu cuenta. Gracias por entrenar con nosotras." />,
    );

    expect(
      screen.getByText("Cerramos tu cuenta. Gracias por entrenar con nosotras."),
    ).toBeOnTheScreen();
  });
});
