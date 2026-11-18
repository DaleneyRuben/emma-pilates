import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import {
  addCivilDays,
  boliviaCivilDate,
  civilDateRange,
  clearMobileQueryCache,
} from "@pilates/mobile-core";

import App from "../../App";
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
// said once above the days, seats are grey text with a pill-free warning
// only when few are left, and the chosen day is the screen's one accent.
describe("Client Reservar, option A", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says the classes left this week once, on a quiet notice", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 3), session("s-2", 2, 8, 3)]);

    const notice = screen.getByTestId("browse-week-notice");
    expect(notice).toHaveStyle({ backgroundColor: "#F5EFE9" });
    expect(within(notice).getByText("Te quedan 3 clases esta semana")).toBeOnTheScreen();
    expect(screen.getAllByText(/clases esta semana/)).toHaveLength(1);
    expect(within(notice).getByTestId("glyph-calendar", hidden)).toHaveProp("stroke", "#6F6662");
  });

  it("says the week is used up instead of «0 clases»", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 0)]);

    expect(
      within(screen.getByTestId("browse-week-notice")).getByText(
        "Ya usaste tus clases de esta semana",
      ),
    ).toBeOnTheScreen();
  });

  it("leaves the notice out without a weekly cap", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, null)]);

    expect(screen.queryByTestId("browse-week-notice")).toBeNull();
  });

  it("groups the classes in one card with grey seats and a warning only when few remain", async () => {
    const screen = await openBrowse([
      session("s-1", 1, 7, 3),
      session("s-2", 2, 2, 3),
      session("s-3", 3, 0, 3),
    ]);

    expect(screen.getByTestId("browse-session-group")).toHaveStyle({
      backgroundColor: "#F5EFE9",
      borderRadius: 16,
    });
    const rows = screen
      .getAllByRole("button", { name: /^Reformer Pilates \d/ })
      .map((row) => within(row));
    expect(screen.queryByTestId("seat-pill")).toBeNull();
    expect(rows[0].getByText("7 cupos")).toHaveStyle({ color: "#6F6662" });
    expect(rows[1].getByText("Quedan 2")).toHaveStyle({ color: "#9A7434" });
    expect(rows[2].getByText("Lleno")).toHaveStyle({ color: "#6F6662" });
    expect(rows[0].queryByTestId("chevron", hidden)).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Reformer Pilates \d/ })[0]).not.toHaveStyle({
      backgroundColor: "#F5EFE9",
    });
  });

  it("marks the chosen Class Type with an underline, not a second pink", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 3)]);

    const strip = within(screen.getByTestId("browse-class-type-strip"));
    expect(strip.getByRole("button", { name: "Todas" })).toHaveStyle({
      borderBottomColor: "#B78380",
      borderBottomWidth: 2,
    });
    expect(strip.getByRole("button", { name: "Todas" })).not.toHaveStyle({
      backgroundColor: "#93615D",
    });
    expect(strip.getByText("Todas")).toHaveStyle({ color: "#4A4A4A" });
    expect(strip.getByText("Mat Pilates")).toHaveStyle({ color: "#6F6662" });
  });

  it("draws «Otra» as a plain day, without the pink tint", async () => {
    const screen = await openBrowse([session("s-1", 1, 7, 3)], 14);

    expect(screen.getByTestId("browse-day-other")).toHaveStyle({ backgroundColor: "#F5EFE9" });
    expect(screen.getByText("Otra")).toHaveStyle({ color: "#6F6662" });
    expect(screen.getByTestId(`browse-day-${addCivilDays(today, 0)}`)).toHaveStyle({
      backgroundColor: "#B78380",
    });
  });
});
