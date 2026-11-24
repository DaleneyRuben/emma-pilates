import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions, StyleSheet } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };
const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};
const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
};
const hour = 60 * 60 * 1_000;
const facts = (startsAt: Date) => ({
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000).toISOString(),
});
const booking = (id: string, startsIn: number) => ({
  kind: "booking",
  bookingId: id,
  sessionId: `session-${id}`,
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  branchName: "Urubó",
  ...facts(new Date(Date.now() + startsIn)),
});
// Inside the Cancellation Window, so it offers «Reprogramar».
const soon = booking("booking-soon", hour);
const alternative = {
  id: "session-alt",
  branchId: "branch-centro",
  classTypeId: "class-reformer",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  ...facts(new Date(Date.now() + 3 * hour)),
  capacity: 12,
  bookedCount: 4,
  availableSeats: 8,
  waitlistCount: 0,
};
const history = ["2026-09-05", "2026-09-03", "2026-09-01"].map((day, index) => ({
  bookingId: `past-${index}`,
  sessionId: `past-session-${index}`,
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  trainerPhoto: null,
  branchName: "Centro",
  startsAt: `${day}T13:00:00.000Z`,
  endsAt: `${day}T13:50:00.000Z`,
}));

function windowWidth(width: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height: 1194, scale: 2, width });
}

async function openMyBookings() {
  const { from, until } = civilDateRange(boliviaCivilDate(new Date(soon.startsAt)));
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/bookings": () =>
      jsonResponse([soon, booking("booking-2", 30 * hour), booking("booking-3", 54 * hour)]),
    "/api/v1/bookings/history": () => jsonResponse(history),
    "/api/v1/branches": () =>
      jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle 1" }]),
    [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
      () => jsonResponse([alternative]),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByTestId("tab-bookings", hidden)).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByTestId("tab-bookings", hidden));
  await waitFor(() => expect(screen.getByTestId("bookings-next-class")).toBeOnTheScreen());
  return screen;
}

// Follow-up 289 (05T, 06T, 07T): on a tablet the Próximas/Historial switch
// sits at the end of the title's row, the bookings and the past classes go
// two to a row, and Reprogramar puts the booking beside today's classes.
describe("Mis reservas on a tablet", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("puts the switch in the title's row and the bookings two to a row", async () => {
    windowWidth(834);
    const screen = await openMyBookings();

    const band = within(screen.getByTestId("bookings-header"));
    expect(band.getByTestId("bookings-band-tabs")).toHaveStyle({ width: 340 });
    expect(band.getByRole("tab", { name: "Próximas" })).toBeSelected();
    // The next class stays a full-width hero above the grid.
    const grid = within(screen.getByTestId("bookings-grid"));
    expect(grid.queryByTestId("bookings-next-class")).toBeNull();
    expect(grid.getAllByRole("button", { name: "Cancelar reserva" })).toHaveLength(2);
    expect(
      StyleSheet.flatten(screen.getByTestId("bookings-scroll").props.contentContainerStyle),
    ).toMatchObject({ gap: 16 });
  });

  it("draws the history's classes as cards two to a row, 12 pt apart", async () => {
    windowWidth(834);
    const screen = await openMyBookings();

    await fireEvent.press(screen.getByRole("tab", { name: "Historial" }));
    await waitFor(() => expect(screen.getByTestId("class-history-grid")).toBeOnTheScreen());
    expect(screen.getByTestId("class-history-grid")).toHaveStyle({ gap: 12 });
    const rows = screen.getAllByTestId("class-history-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveStyle({ backgroundColor: "#FFFBFB", borderRadius: 20 });
  });

  it("puts the booking beside today's other classes in Reprogramar", async () => {
    windowWidth(834);
    const screen = await openMyBookings();

    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));
    await waitFor(() => expect(screen.getByText("Otras clases de hoy")).toBeOnTheScreen());
    expect(screen.getByTestId("tablet-columns-left")).toHaveStyle({ width: 300 });
    expect(
      within(screen.getByTestId("tablet-columns-left")).getByText("Tu reserva actual"),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("tablet-columns-right")).getByText("Otras clases de hoy"),
    ).toBeOnTheScreen();
    const footer = within(screen.getByTestId("reschedule-footer"));
    expect(footer.getByTestId("tablet-column")).toHaveStyle({ maxWidth: 480 });
    expect(footer.getByTestId("reschedule-confirm")).toBeOnTheScreen();
  });

  it("keeps the phone's band, list and Reprogramar under 768 pt", async () => {
    windowWidth(390);
    const screen = await openMyBookings();

    expect(screen.queryByTestId("bookings-band-tabs")).toBeNull();
    expect(screen.queryByTestId("bookings-grid")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));
    await waitFor(() => expect(screen.getByText("Otras clases de hoy")).toBeOnTheScreen());
    expect(screen.queryByTestId("tablet-columns")).toBeNull();
    expect(screen.queryByTestId("tablet-column")).toBeNull();
  });
});
