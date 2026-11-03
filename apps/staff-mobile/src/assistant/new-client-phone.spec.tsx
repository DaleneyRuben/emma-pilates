import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

// FIX-030 with MOB-070: Nuevo cliente takes a Bolivian mobile, 8 digits after +591.
describe("Nuevo cliente phone", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it.each(["7000004", "70000001"])("refuses %s and sends nothing", async (typed) => {
    const invited = jest.fn();
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () => {
        invited();
        return jsonResponse({ status: "invited", clientId: "c", email: "a@example.com" }, 201);
      },
    });

    await fireEvent.press(screen.getByTestId("client-search-new-client"));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Teléfono (opcional)"), typed);
    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(
      await screen.findByText("Escribe un celular de Bolivia, por ejemplo +591 71234567."),
    ).toBeOnTheScreen();
    expect(invited).not.toHaveBeenCalled();
  });
});
