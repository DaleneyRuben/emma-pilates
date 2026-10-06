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
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("draws the bare calendar, title, note, and booking action", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia/bookings": () => jsonResponse([]),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Ver reservas" }));
    await waitFor(() => {
      expect(screen.getByText("Esta clienta no tiene reservas próximas.")).toBeOnTheScreen();
    });
    expect(screen.getByText("Esta clienta no tiene reservas próximas.")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 21,
    });
    const calendar = screen.getByTestId("empty-state-icon-calendar", hidden);
    expect(calendar).toHaveProp("stroke", "#C4BAB6");
    expect(calendar).toHaveProp("width", 34);
    expect(
      screen.getByText("Puedes reservarle una clase desde el horario del estudio."),
    ).toHaveStyle({ color: "#766D69", fontSize: 14 });
    const action = screen.getByTestId("empty-state-action");
    expect(action).toHaveStyle({ marginTop: 6, minWidth: 220 });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar una clase" }));
    await waitFor(() => {
      expect(screen.getByText("Reservando para: Lucía Fernández")).toBeOnTheScreen();
    });
    const picker = screen.getByTestId("branch-picker-chevron", hidden);
    expect(picker).toHaveProp("stroke", "#766D69");
    expect(picker).toHaveProp("width", 16);
    expect(screen.getByTestId("branch-picker-chevron-down", hidden)).toBeOnTheScreen();
    expect(screen.queryByText("▾")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Sucursal: Centro" }));
    expect(screen.getByTestId("branch-picker-chevron-up", hidden)).toBeOnTheScreen();
  });
});
