import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { assistantRoutes, openClientSearch } from "./assistant-fixtures";

jest.setTimeout(20_000);

// MOB-060: a Staff submit shows it is working while the request is in flight.
describe("Staff busy buttons", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows Crear cuenta busy while the invitation is sent", async () => {
    const screen = await openClientSearch({
      ...assistantRoutes(),
      "POST /api/v1/assistant/client-invitations": () =>
        new Promise<Response>(() => undefined) as unknown as Response,
    });

    await fireEvent.press(screen.getByRole("button", { name: "+ Nuevo cliente" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Nuevo cliente")).toBeOnTheScreen();
    });
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Nueva");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeBusy();
    });
  });
});
