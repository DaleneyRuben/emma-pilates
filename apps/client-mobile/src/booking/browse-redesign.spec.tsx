import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import {
  addCivilDays,
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
} from "@pilates/mobile-core";

import App from "../../App";
import { weekNoticeLine } from "./browse-week-notice";
import { createClientRuntime, jsonResponse, routeFetcher, studioRules } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Trimestral",
    originalClassAllowance: 36,
    remainingClassAllowance: 25,
    startsOn: "2026-09-11",
    endsOn: "2099-10-11",
  },
};
const classTypes = [
  { id: "class-reformer", name: "Reformer Pilates", description: "", durationMinutes: 50 },
  { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 },
];
const today = boliviaCivilDate(new Date());
const { from, until } = civilDateRange(today);
const sessionsPath = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

const session = (id: string, hoursAhead: number, availableSeats: number, left: number | null) => {
  const startsAt = new Date(Date.now() + hoursAhead * 60 * 60_000);
  return {
    id,
    branchId: "branch-centro",
    classTypeId: "class-reformer",
    trainerStaffMemberId: "trainer-1",
    classTypeName: "Reformer Pilates",
    trainerName: "Emma Vargas",
    trainerPhoto: null,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 50 * 60_000).toISOString(),
    capacity: 12,
    bookedCount: 12 - availableSeats,
    availableSeats,
    waitlistCount: 0,
    classesLeftThisWeek: left,
  };
};

async function openBrowse(sessions: unknown[], windowDays = 7) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () =>
            jsonResponse({
              id: "client-1",
              name: "Carla Méndez",
              email: "carla@example.com",
              phone: null,
              referralCode: "REF-CARLA",
            }),
          "/api/v1/clients/current/subscription": () => jsonResponse(active),
          "/api/v1/branches": () =>
            jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
          "/api/v1/class-types": () => jsonResponse(classTypes),
          "/api/v1/studio-rules": () =>
            jsonResponse({ ...studioRules, bookingWindowDays: windowDays }),
          [sessionsPath]: () => jsonResponse(sessions),
        }),
      )}
    />,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ }).length).toBeGreaterThan(
      0,
    ),
  );
  return screen;
}

// FIX-082 (design audit 2026-11-18, Reservar option A): the weekly cap is
// said once above the days. FIX-089 (palette B, ClaseE): the classes are rows
// of one Crema card with a Rubor time box and the seats in bold Rosa profundo,
// «Quedan N» included; the chosen day and Class Type are Rosa profundo chips.
describe("Client Reservar, palette B", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says the classes left this week once, on a quiet notice", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 3), session("s-2", 2, 8, 3)]);

    const notice = screen.getByTestId("browse-week-notice");
    expect(notice).toHaveStyle({ backgroundColor: "#F9F4F2" });
    expect(within(notice).getByText("Te quedan 3 clases esta semana")).toBeOnTheScreen();
    expect(screen.getAllByText(/clases esta semana/)).toHaveLength(1);
    expect(within(notice).getByTestId("glyph-calendar", hidden)).toHaveProp("stroke", "#93615D");
  });

  it("says the week is used up instead of «0 clases»", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 0)]);

    expect(
      within(screen.getByTestId("browse-week-notice")).getByText(
        "Ya usaste tus clases de esta semana",
      ),
    ).toBeOnTheScreen();
  });

  // Review of FIX-082: the count is for the chosen day's week, so a later
  // week never reads as this one.
  it("names a later week as «esa semana»", () => {
    const monday = "2026-11-23";
    expect(weekNoticeLine(3, monday, "2026-11-18")).toBe("Esa semana te quedan 3 clases");
    expect(weekNoticeLine(1, monday, "2026-11-18")).toBe("Esa semana te queda 1 clase");
    expect(weekNoticeLine(0, monday, "2026-11-18")).toBe("Ya usaste tus clases de esa semana");
    expect(weekNoticeLine(3, "2026-11-22", "2026-11-18")).toBe("Te quedan 3 clases esta semana");
    expect(weekNoticeLine(null, monday, "2026-11-18")).toBeNull();
  });

  it("leaves the notice out without a weekly cap", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, null)]);

    expect(screen.queryByTestId("browse-week-notice")).toBeNull();
  });

  it("draws the classes as rows of one card with bold seats, «Quedan N» included", async () => {
    const screen = await openBrowse([
      session("s-1", 1, 7, 3),
      session("s-2", 2, 2, 3),
      session("s-3", 3, 0, 3),
    ]);

    expect(screen.getByTestId("browse-session-group")).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderRadius: 16,
      borderWidth: 1,
    });
    expect(screen.getAllByTestId("class-list-divider")).toHaveLength(2);
    const rows = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((row) => within(row));
    expect(screen.queryByTestId("seat-pill")).toBeNull();
    const seats = {
      color: "#93615D",
      fontFamily: "WorkSans_600SemiBold",
      fontWeight: "600" as const,
    };
    expect(rows[0].getByText("5 de 12 lugares")).toHaveStyle(seats);
    expect(rows[1].getByText("Quedan 2 lugares")).toHaveStyle(seats);
    expect(rows[2].getByText("Lleno")).toHaveStyle(seats);
    expect(rows[0].getByTestId("class-row-time")).toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(rows[0].getByTestId("chevron", hidden)).toBeOnTheScreen();
  });

  it("marks the chosen Class Type as a Rosa profundo chip", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 3)]);

    const strip = within(screen.getByTestId("browse-class-type-strip"));
    expect(strip.getByRole("button", { name: "Todas" })).toHaveStyle({
      backgroundColor: "#93615D",
      minHeight: 38,
    });
    expect(strip.getByText("Todas")).toHaveStyle({ color: "#F9F4F2" });
    expect(strip.getByRole("button", { name: "Mat Pilates" })).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
      borderWidth: 1,
    });
    expect(strip.getByText("Mat Pilates")).toHaveStyle({ color: "#93615D" });
  });

  it("draws the days as chips, the chosen one Rosa profundo", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 3)], 14);

    expect(screen.getByTestId("browse-day-other")).toHaveStyle({
      backgroundColor: "#F9F4F2",
      borderColor: "#CDA697",
    });
    expect(screen.getByText("Otra")).toHaveStyle({ color: "#93615D" });
    const chosen = screen.getByTestId(`browse-day-${addCivilDays(today, 0)}`);
    expect(chosen).toHaveStyle({ backgroundColor: "#93615D" });
    expect(within(chosen).getByText("Hoy")).toHaveStyle({ color: "#F9F4F2", fontSize: 12 });
  });
});
