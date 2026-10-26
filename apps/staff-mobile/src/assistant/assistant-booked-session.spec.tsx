import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, farBooking, openLucia, waitlistEntry } from "./assistant-fixtures";

jest.setTimeout(20_000);

// UX-003: a Session the Client is already booked into is marked on S07 and
// S08 shows the booked state instead of «Reservar», so the Assistant is not
// refused after the last tap (UX-001 finding S2).
const bookedSession = { ...farBooking, bookingId: "booking-session-1", sessionId: "session-1" };

function bookedRoutes() {
  return {
    ...assistantRoutes(),
    "/api/v1/assistant/clients/client-lucia/bookings": () =>
      jsonResponse([bookedSession, waitlistEntry]),
  };
}

async function openBrowse(routes: ReturnType<typeof bookedRoutes>) {
  const screen = await openLucia(routes);
  await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
  });
  return screen;
}

describe("Assistant booked Session", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("marks the Client's own booking on the list with the neutral «Ya reservada» pill", async () => {
    const screen = await openBrowse(bookedRoutes());

    const card = within(
      screen.getByRole("button", {
        name: /^Reformer Pilates \d.*, Ya reservada$/,
      }),
    );
    await waitFor(() => {
      expect(card.getByText("Ya reservada")).toBeOnTheScreen();
    });
    expect(card.queryByText("6 cupos")).toBeNull();
    expect(card.getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.34)",
    });
    expect(card.getByText("Ya reservada")).toHaveStyle({ color: "#6E6663", fontSize: 12 });
  });

  it("keeps the seat count on a Session she only waits for", async () => {
    const screen = await openBrowse({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia/bookings": () =>
        jsonResponse([{ ...waitlistEntry, sessionId: "session-1" }]),
    });

    const card = within(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    expect(card.getByText("6 cupos")).toBeOnTheScreen();
    expect(card.queryByText("Ya reservada")).toBeNull();
  });

  it("shows the booked state on the detail instead of the «Reservar» button", async () => {
    const screen = await openBrowse(bookedRoutes());

    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    await waitFor(() => {
      expect(screen.getByText("La clienta ya tiene esta clase reservada.")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Reservar" })).toBeNull();
    expect(screen.queryByText("Se descontará 1 clase de su plan.")).toBeNull();
    expect(screen.getByText("6 de 12 cupos disponibles")).toBeOnTheScreen();
  });
});
