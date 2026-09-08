import { fireEvent, render } from "@testing-library/react-native";

import { LoginScreen } from "./login-screen";

async function submitLogin(
  onSubmit: jest.Mock,
) {
  const screen = await render(<LoginScreen onSubmit={onSubmit} />);

  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "ana@example.com",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "local password",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Iniciar sesión" }),
  );

  return screen;
}

describe("LoginScreen", () => {
  it("shows neutral feedback for rejected credentials", async () => {
    const screen = await submitLogin(
      jest.fn().mockResolvedValue({ status: "rejected" }),
    );

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
        name: "Demasiados intentos. Inténtalo de nuevo en 30 segundos.",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeDisabled();
  });
});
