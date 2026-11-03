import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { agendaDayChipLabel, clearMobileQueryCache } from "@pilates/mobile-core";

import { routeFetcher } from "../test-support";
import { inDays, openAvailability, routes, today } from "./nutritionist-test-support";

jest.setTimeout(30_000);

// v2 S17: «Día» is a row of short tiles sharing the width, and «A partir del»
// draws two-line tiles (weekday or «Hoy» over the day number), not pills.
describe("Nuevo horario tiles", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the weekday tiles with short names and the start dates as day tiles", async () => {
    const screen = await openAvailability(routeFetcher(routes({})));
    await fireEvent.press(screen.getAllByRole("button", { name: "Nuevo horario" })[0]!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Lunes" })).toBeOnTheScreen();
    });
    const monday = screen.getByRole("button", { name: "Lunes" });
    expect(within(monday).getByText("Lun")).toBeOnTheScreen();
    expect(monday).toHaveStyle({ flex: 1, minWidth: 0 });
    expect(within(screen.getByRole("button", { name: "Domingo" })).getByText("Dom")).toBeOnTheScreen();

    const todayTile = screen.getByRole("button", { name: "Fecha Hoy" });
    expect(within(todayTile).getByText("Hoy")).toBeOnTheScreen();
    expect(within(todayTile).getByText(agendaDayChipLabel(today).day)).toBeOnTheScreen();
    expect(todayTile).toHaveStyle({ height: 60 });

    const tomorrow = agendaDayChipLabel(inDays(1));
    const tomorrowTile = screen.getByRole("button", { name: "Fecha Mañana" });
    expect(within(tomorrowTile).getByText(tomorrow.weekday.toLowerCase())).toBeOnTheScreen();
    expect(within(tomorrowTile).getByText(tomorrow.day)).toBeOnTheScreen();
  });
});
