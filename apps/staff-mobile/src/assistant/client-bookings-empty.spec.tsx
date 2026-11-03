import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia } from "./assistant-fixtures";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

// MOB-041: S21's frame centres a quiet calendar, a Lora 21 title, a note, and
// «Reservar una clase» under them; S07's «Sucursal:» row ends in a 16 pt
// Texto tenue chevron pointing down.
describe("Assistant Client Bookings empty state", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the v2 calendar disc, title, note, and booking action", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia/bookings": () => jsonResponse([]),
    });

    await fireEvent.press(screen.getByTestId("client-overview-bookings"));
    await waitFor(() => {
      expect(screen.getByText("No tiene reservas próximas")).toBeOnTheScreen();
    });
    expect(screen.getByText("No tiene reservas próximas")).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 24,
    });
    const calendar = screen.getByTestId("empty-state-icon-calendar", hidden);
    expect(calendar).toHaveProp("stroke", "#93615D");
    expect(calendar).toHaveProp("width", 32);
    expect(
      screen.getByText("Puedes reservarle una clase desde el horario del estudio."),
    ).toHaveStyle({ color: "#6F6662", fontSize: 15 });
    const action = screen.getByTestId("empty-state-action");
    expect(action).toHaveStyle({ marginTop: 8, minWidth: 220 });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar una clase" }));
    // The banner shows while the Branches load; the Branch line follows them.
    await waitFor(() => {
      expect(screen.getByText(/^Reservando para Lucía Fernández/)).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Sucursal: Centro" }));
    expect(screen.getByRole("button", { name: "Urubó" })).toBeOnTheScreen();
  });
});
