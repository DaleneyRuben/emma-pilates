import { fireEvent, render } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

const api = { register: jest.fn() } as unknown as AuthenticationApi;

async function openRegistration() {
  const screen = await render(<AuthenticationFlow api={api} />);
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  return screen;
}

// FIX-089 (FormB, owner 2026-11-19): saving with fields missing says how many
// on Rubor at the top and names them; examples sit under the field.
describe("Registration form summary", () => {
  it("lists every missing field at the top after Crear cuenta", async () => {
    const screen = await openRegistration();

    expect(screen.queryByTestId("form-error-summary")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("Faltan 6 datos para guardar")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Nombre · Correo electrónico · Celular · Contraseña · Confirmar contraseña · Cómo nos conociste",
      ),
    ).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("drops a field from the summary once it is right", async () => {
    const screen = await openRegistration();
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");

    expect(screen.getByText("Faltan 5 datos para guardar")).toBeOnTheScreen();
  });

  it("gives the email example under the field, not in it", async () => {
    const screen = await openRegistration();

    expect(screen.queryByPlaceholderText("tu@correo.com")).toBeNull();
    expect(screen.getByText("Ej.: tu@correo.com")).toBeOnTheScreen();
  });
});
