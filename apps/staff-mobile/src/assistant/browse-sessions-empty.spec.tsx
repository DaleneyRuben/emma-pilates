import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, from, openLucia, session, until } from "./assistant-fixtures";

jest.setTimeout(20_000);

const todaySessions = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

async function openBooking(sessions: unknown[]) {
  const screen = await openLucia({
    ...assistantRoutes(),
    [todaySessions]: () => jsonResponse(sessions),
  });
  await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
  await waitFor(() => expect(screen.getByTestId("assistant-day-strip")).toBeOnTheScreen());
  return screen;
}

// Walkthrough 6 (option A), also for S07: an empty day says why and offers a way out.
describe("Assistant booking empty states (S07)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("offers every class when the chosen type has none today", async () => {
    const screen = await openBooking([session]);
    await waitFor(() => expect(screen.getByTestId("session-card-session-1")).toBeOnTheScreen());

    await fireEvent.press(screen.getByRole("button", { name: "Mat Pilates" }));
    expect(screen.getByText("Hoy no hay Mat Pilates")).toBeOnTheScreen();
    expect(
      screen.getByText("Prueba otro día o mira todas las clases de este día."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Ver todas las clases" }));
    expect(screen.getByTestId("session-card-session-1")).toBeOnTheScreen();
  });

  it("offers tomorrow when the day has no classes at all", async () => {
    const screen = await openBooking([]);

    await waitFor(() => expect(screen.getByText("Este día no hay clases")).toBeOnTheScreen());
    expect(screen.getByText("Elige otro día de la semana para reservar.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver mañana" }));
    expect(screen.getByLabelText(/^Hoy /)).toHaveProp("accessibilityState", { selected: false });
  });
});
