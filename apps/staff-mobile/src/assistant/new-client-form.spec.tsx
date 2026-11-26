import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, textVariants } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

async function openNewClient(invited = jest.fn()) {
  const screen = await openClientSearch({
    ...assistantRoutes(),
    "POST /api/v1/assistant/client-invitations": () => {
      invited();
      return jsonResponse({ status: "invited", clientId: "c", email: "a@example.com" }, 201);
    },
  });
  await fireEvent.press(screen.getByTestId("client-search-new-client"));
  await waitFor(() => expect(screen.getByLabelText("Nueva clienta")).toBeOnTheScreen());
  return screen;
}

// FIX-089 (FormB): labels above Crema fields, examples under the field and
// never in it, and on a save with data missing a Rubor summary at the top
// with each field marked by a 2 pt Rosa profundo border and a bold message.
describe("Nueva clienta form", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws white fields with a 400 outline and the example under the email", async () => {
    const screen = await openNewClient();

    expect(screen.getByLabelText("Nombre")).toHaveStyle({
      backgroundColor: "#FFFBFB",
      borderColor: "#CDA697",
      borderWidth: 1.5,
    });
    expect(screen.queryByPlaceholderText("correo@ejemplo.com")).toBeNull();
    expect(screen.getByText("Ej.: lucia@gmail.com")).toHaveStyle(textVariants.secundario);
  });

  // Walkthrough n.º 6: «Crear cuenta» ends the form and scrolls with it.
  it("keeps «Crear cuenta» and its note at the end of the form", async () => {
    const screen = await openNewClient();
    const end = screen.getByTestId("new-client-end");

    expect(within(end).getByTestId("new-client-submit")).toBeOnTheScreen();
    expect(
      within(end).getByText("Le enviaremos un enlace de activación al correo. Vence en 7 días."),
    ).toBeOnTheScreen();
  });

  it("sums up what is missing at the top and marks each field on save", async () => {
    const invited = jest.fn();
    const screen = await openNewClient(invited);

    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Faltan 4 datos para guardar")).toBeOnTheScreen();
    expect(
      screen.getByText("Nombre · Correo electrónico · Celular · ¿Cómo nos conoció?"),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("form-error-summary")).toHaveStyle({ backgroundColor: "#FEF6F2" });
    for (const label of ["Nombre", "Correo electrónico"]) {
      expect(screen.getByLabelText(label)).toHaveStyle({
        borderColor: "#93615D",
        borderWidth: 2,
      });
    }
    // Follow-up 285: a field's error is a secundario line under it.
    expect(screen.getByText("Escribe el nombre.")).toHaveStyle(textVariants.secundario);
    expect(invited).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(await screen.findByText("Faltan 3 datos para guardar")).toBeOnTheScreen();
  });
});
