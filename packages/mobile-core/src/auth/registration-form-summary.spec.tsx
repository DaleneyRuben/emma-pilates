import { fireEvent, render, within } from "@testing-library/react-native";

import type { AuthenticationApi } from "./authentication-api";
import { AuthenticationFlow } from "./authentication-flow";

const api = { register: jest.fn() } as unknown as AuthenticationApi;

async function openRegistration() {
  const screen = await render(<AuthenticationFlow api={api} />);
  await fireEvent.press(screen.getByRole("button", { name: "Regístrate" }));
  return screen;
}

// C6 B (owner 2026-11-19): one screen titled «Crea tu cuenta»; saving with
// fields missing names only those at the top, with a short error under each.
describe("Registration form summary", () => {
  it("titles the screen «Crea tu cuenta» under Encabezado A, with the way back to Login", async () => {
    const screen = await openRegistration();

    expect(screen.getByRole("header", { name: "Crea tu cuenta" })).toBeOnTheScreen();
    expect(screen.queryByText("Emma Pilates Studio")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("button", { name: "Regístrate" })).toBeOnTheScreen();
  });

  it("names every missing field at the top after Crear cuenta", async () => {
    const screen = await openRegistration();

    expect(screen.queryByTestId("form-error-summary")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("Revisa 6 datos antes de seguir")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Nombre · Correo electrónico · Celular · Contraseña · Confirmar contraseña · ¿Cómo nos conociste?",
      ),
    ).toBeOnTheScreen();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("puts a short error under each marked field", async () => {
    const screen = await openRegistration();
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    for (const error of [
      "! Escribe tu nombre",
      "! Escribe un correo válido",
      "! Escribe tu número",
      "! Usa al menos 8 caracteres",
      "! Repite la contraseña",
      "! Elige una opción",
    ]) {
      expect(screen.getByRole("alert", { name: error })).toBeOnTheScreen();
    }
  });

  it("names only what is still missing", async () => {
    const screen = await openRegistration();
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "lucia@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "pilates2026");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "pilates2026");
    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("Revisa 1 dato antes de seguir")).toBeOnTheScreen();
    expect(within(screen.getByTestId("form-error-summary")).getByText("Celular")).toBeOnTheScreen();
    expect(screen.getAllByRole("alert", { name: /^! / })).toHaveLength(1);
  });

  it("drops a field from the summary once it is right", async () => {
    const screen = await openRegistration();
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Mendoza");

    expect(screen.getByText("Revisa 5 datos antes de seguir")).toBeOnTheScreen();
  });

  it("gives the examples and the password rule under the fields, not in them", async () => {
    const screen = await openRegistration();

    expect(screen.queryByPlaceholderText("tu@correo.com")).toBeNull();
    expect(screen.getByText("Ej.: tu@correo.com")).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText("Tu nombre y apellido")).toBeNull();
    expect(screen.getByText("Ej.: Lucía Mendoza")).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText("Mínimo 8 caracteres")).toBeNull();
    expect(screen.getByText("Mínimo 8 caracteres")).toBeOnTheScreen();
  });

  it("draws «¿Cómo nos conociste?» as chips, the chosen one Rosa profundo", async () => {
    const screen = await openRegistration();

    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));

    expect(screen.getByRole("radio", { name: "Instagram" })).toHaveStyle({
      backgroundColor: "#93615D",
      minHeight: 38,
    });
    // Follow-up 285: a chip is compacto, chosen or not; only ground and tone change.
    expect(screen.getByText("Instagram")).toHaveStyle({
      color: "#FFFBFB",
      fontFamily: "WorkSans_400Regular",
    });
    expect(screen.getByRole("radio", { name: "TikTok" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderColor: "#CDA697",
      borderWidth: 1.5,
    });
    expect(screen.getByText("¿Cómo nos conociste?")).toHaveStyle({
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 14,
    });
  });
});
