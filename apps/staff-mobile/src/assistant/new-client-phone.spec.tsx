import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

// FIX-030 with MOB-070 and decision §19.20: Nuevo cliente takes a Bolivian mobile,
// 8 digits starting with 6 or 7, and sends it with the implicit +591. FIX-037
// (follow-up 236): «Celular» is required, and another country can be chosen.
describe("Nuevo cliente phone", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it.each([
    ["7000004", "Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7."],
    ["80000001", "Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7."],
    ["", "Escribe tu celular. Lo necesitamos para escribirte por WhatsApp."],
  ])("refuses %p and sends nothing", async (typed, message) => {
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
    await fireEvent.changeText(screen.getByLabelText("Celular"), typed);
    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(invited).not.toHaveBeenCalled();
  });
  it.each([
    ["70000001", "+591 70000001"],
    ["6000 0002", "+591 60000002"],
  ])("sends %s as %s", async (typed, sent) => {
    const bodies: unknown[] = [];
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": (init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return jsonResponse({ status: "invited", clientId: "c", email: "a@example.com" }, 201);
      },
    });

    await fireEvent.press(screen.getByTestId("client-search-new-client"));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Celular"), typed);
    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(bodies).toEqual([expect.objectContaining({ phone: sent })]);
    });
  });

  it("sends a number from another country with its code", async () => {
    const bodies: unknown[] = [];
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": (init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return jsonResponse({ status: "invited", clientId: "c", email: "a@example.com" }, 201);
      },
    });

    await fireEvent.press(screen.getByTestId("client-search-new-client"));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Valentina Ríos");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "vale@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "País: Bolivia, +591" }));
    await fireEvent.press(screen.getAllByRole("button", { name: "Perú, +51" })[0]);
    await fireEvent.changeText(screen.getByLabelText("Celular"), "912 345 678");
    await fireEvent.press(screen.getByRole("radio", { name: "Instagram" }));
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(bodies).toEqual([expect.objectContaining({ phone: "+51 912345678" })]);
    });
  });
});
