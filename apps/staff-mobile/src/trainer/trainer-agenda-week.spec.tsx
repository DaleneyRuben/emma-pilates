import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

// 2026-10-21 is a Wednesday; 12:00 in La Paz (UTC−4).
const wednesday = new Date("2026-10-21T16:00:00.000Z");
const minute = 60_000;

const at = (date: string, time: string, sessionId: string, extra: object = {}) => {
  const startsAt = new Date(`${date}T${time}:00.000-04:00`);
  return {
    bookedCount: 2,
    branchName: "Achumani",
    capacity: 8,
    classTypeName: "Mat Pilates",
    endsAt: new Date(startsAt.getTime() + 60 * minute).toISOString(),
    sessionId,
    startsAt: startsAt.toISOString(),
    ...extra,
  };
};

const day = (date: string) => `/api/v1/trainer/sessions?on=${date}&includeCancelled=true`;
const cancelled = {
  cancellation: { cause: "minimum_not_met", cancelledAt: "2026-10-20T12:00:00.000Z" },
};

const renderAgenda = (week: Record<string, unknown[]>) => {
  const fetcher = routeFetcher({
    ...Object.fromEntries(
      Object.entries(week).map(([date, sessions]) => [day(date), () => jsonResponse(sessions)]),
    ),
    "/api/v1/trainer/sessions": () => jsonResponse([]),
    "/api/v1/trainer/sessions/session-next/roster": () =>
      jsonResponse({ ...at("2026-10-21", "12:20", "session-next"), bookings: [] }),
    "/api/v1/staff-members/current": () =>
      jsonResponse({
        id: "staff-1",
        name: "Daniela Rojas",
        email: "daniela@example.com",
        phone: null,
        role: "trainer",
        branches: [],
      }),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  return render(<App runtime={createStaffRuntime(fetcher)} />);
};

// E1 B «La semana de un vistazo»: each day of the strip says how many classes
// she has, and the next class names who is coming by initials.
describe("Trainer agenda week at a glance (E1 B)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "queueMicrotask", "setImmediate"] });
    jest.setSystemTime(wednesday);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await cleanup();
    clearMobileQueryCache();
  });

  it("counts each day's standing classes on the strip, a dash for a free day", async () => {
    const screen = await renderAgenda({
      "2026-10-21": [
        at("2026-10-21", "12:20", "session-next"),
        at("2026-10-21", "17:00", "session-later"),
        at("2026-10-21", "18:00", "session-cancelled", cancelled),
      ],
      "2026-10-22": [at("2026-10-22", "08:00", "session-thu")],
    });

    expect(await screen.findByText("Esta semana · clases por día")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByTestId("agenda-day-2026-10-21-count")).toHaveTextContent("2");
    });
    expect(screen.getByLabelText("Hoy 21, 2 clases")).toHaveProp("accessibilityState", {
      selected: true,
    });
    expect(screen.getByTestId("agenda-day-2026-10-22-count")).toHaveTextContent("1");
    expect(screen.getByLabelText("Jue 22, 1 clase")).toBeOnTheScreen();
    expect(screen.getByTestId("agenda-day-2026-10-23-count")).toHaveTextContent("—");
    expect(screen.getByLabelText("Vie 23, sin clases")).toBeOnTheScreen();
    // «Hoy» stays next to the strip's title.
    expect(screen.getByRole("button", { name: "Hoy" })).toBeOnTheScreen();
  });

  it("names who is coming to the next class, five circles and «+N»", async () => {
    const screen = await renderAgenda({
      "2026-10-21": [
        at("2026-10-21", "12:20", "session-next", {
          bookedCount: 7,
          attendeeInitials: ["LF", "EP", "MP", "AQ", "VR", "SG", "NT"],
        }),
        at("2026-10-21", "17:00", "session-later", { attendeeInitials: ["LF", "EP"] }),
      ],
    });

    const hero = await screen.findByTestId("next-class-hero");
    const circles = within(hero).getAllByTestId("hero-attendee");
    expect(circles.map((circle) => within(circle).getByText(/.+/).props.children)).toEqual([
      "LF",
      "EP",
      "MP",
      "AQ",
      "VR",
      "+2",
    ]);
    expect(within(hero).getByText("Achumani · 60 min")).toBeOnTheScreen();
    expect(within(hero).getByText("7 de 8")).toBeOnTheScreen();
    // The later class stays a row, with no circles.
    expect(screen.getAllByTestId("hero-attendee")).toHaveLength(6);

    await fireEvent.press(within(hero).getByRole("button"));
    expect(await screen.findByText("No hay reservas para esta clase.")).toBeOnTheScreen();
  });

  // On a tablet the week and the hero keep a phone's column, never stretched.
  it("caps the agenda's column on a tablet", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
    const screen = await renderAgenda({
      "2026-10-21": [at("2026-10-21", "12:20", "session-next")],
    });

    await screen.findByTestId("next-class-hero");
    expect(screen.getByTestId("agenda-column")).toHaveStyle({ maxWidth: 560 });
    jest.restoreAllMocks();
  });
});
