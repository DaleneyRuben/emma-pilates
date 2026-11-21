import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const minute = 60_000;

// Starts `offset` minutes from now (10:00 in La Paz under the frozen clock).
const session = (sessionId: string, classTypeName: string, bookedCount: number, offset: number) => {
  const startsAt = new Date(Date.now() + offset * minute);
  return {
    bookedCount,
    branchName: "Sopocachi",
    capacity: 8,
    classTypeName,
    endsAt: new Date(startsAt.getTime() + 50 * minute).toISOString(),
    sessionId,
    startsAt: startsAt.toISOString(),
  };
};

const renderAgenda = (sessions: unknown[]) =>
  render(
    <App
      runtime={createStaffRuntime(
        routeFetcher({
          "/api/v1/trainer/sessions": () => jsonResponse(sessions),
          "/api/v1/trainer/sessions/session-2/roster": () =>
            jsonResponse({
              sessionId: "session-2",
              classTypeName: "Reformer Pilates",
              branchName: "Sopocachi",
              startsAt: (sessions[1] as { startsAt: string }).startsAt,
              endsAt: (sessions[1] as { endsAt: string }).endsAt,
              capacity: 8,
              bookings: [],
            }),
          "/api/v1/staff-members/current": () =>
            jsonResponse({
              id: "staff-1",
              name: "Emma Vargas",
              email: "emma.vargas@example.com",
              phone: null,
              role: "trainer",
              branches: [],
            }),
          "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
        }),
      )}
    />,
  );

// FIX-089 (ClaseE): the next class is the Palo de rosa hero; the others are
// rows of one card with the places in words, never a «Con cupos» pill.
describe("Trainer agenda rows", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the day's next class in the hero and the others in one class list", async () => {
    const screen = await renderAgenda([
      session("session-1", "Mat Pilates", 3, -90),
      session("session-2", "Reformer Pilates", 2, 40),
      session("session-3", "Mat Pilates", 8, 180),
    ]);

    await waitFor(() => expect(screen.getByTestId("next-class-hero")).toBeOnTheScreen());
    const hero = within(screen.getByTestId("next-class-hero"));
    expect(hero.getByText("Próxima · en 40 min")).toBeOnTheScreen();
    expect(hero.getByText("10:40 · Reformer Pilates")).toBeOnTheScreen();
    expect(hero.getByText("2 de 8")).toBeOnTheScreen();
    // E1 B: the branch and the length, «Sopocachi · 50 min».
    expect(hero.getByText("Sopocachi · 50 min")).toBeOnTheScreen();

    const list = within(screen.getByTestId("class-list"));
    expect(list.getByText("08:30")).toBeOnTheScreen();
    expect(list.getByText("13:00")).toBeOnTheScreen();
    expect(list.queryByText("10:40")).toBeNull();
    expect(list.getByText("3 de 8")).toBeOnTheScreen();
    expect(list.getByText("8 de 8")).toBeOnTheScreen();
    expect(screen.getByText("Hoy · 3 clases")).toBeOnTheScreen();
    expect(screen.queryByText("Con cupos")).toBeNull();
    expect(screen.queryByText("Completa")).toBeNull();
    expect(screen.queryByTestId("exception-pill")).toBeNull();

    // Maestro's trainer-attendance flow opens the seeded class by its id,
    // even while it is the hero.
    await fireEvent.press(screen.getByTestId("agenda-session-session-2"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Volver" })).toBeOnTheScreen());
  });

  it("says only «Próxima» when the next class is more than an hour away", async () => {
    const screen = await renderAgenda([
      session("session-1", "Mat Pilates", 0, 120),
      session("session-2", "Reformer Pilates", 0, 240),
    ]);

    await waitFor(() => expect(screen.getByTestId("next-class-hero")).toBeOnTheScreen());
    expect(within(screen.getByTestId("next-class-hero")).getByText("Próxima")).toBeOnTheScreen();
    expect(within(screen.getByTestId("class-list")).getByText("14:00")).toBeOnTheScreen();
  });

  it("draws no hero once the day's classes have all started", async () => {
    const screen = await renderAgenda([session("session-1", "Mat Pilates", 3, -90)]);

    await waitFor(() => expect(screen.getByTestId("class-list")).toBeOnTheScreen());
    expect(screen.queryByTestId("next-class-hero")).toBeNull();
    expect(screen.getByText("08:30")).toBeOnTheScreen();
  });
});
