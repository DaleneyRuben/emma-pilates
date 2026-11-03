import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import {
  boliviaCivilDate,
  civilDateRange,
  formatSessionDate,
  upcomingCivilDates,
} from "@pilates/mobile-core";

jest.setTimeout(20_000);

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

const branches = [
  { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
  { id: "branch-equipetrol", name: "Equipetrol", address: "Av. San Martín 1120" },
];

const classTypes = [
  {
    id: "class-reformer",
    name: "Reformer Pilates",
    description: "Reformer",
    durationMinutes: 50,
  },
  { id: "class-mat", name: "Mat Pilates", description: "Mat", durationMinutes: 50 },
];

const today = boliviaCivilDate(new Date());
const { from, until } = civilDateRange(today);
const dates = upcomingCivilDates(today, 7);
const sessionsUrl = (start: string, end: string) =>
  `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(start)}&until=${encodeURIComponent(end)}&limit=100`;
const dayUrl = (date: string) => sessionsUrl(civilDateRange(date).from, civilDateRange(date).until);
const weekUrl = sessionsUrl(civilDateRange(dates[0]).from, civilDateRange(dates[6]).until);
const inOneHour = new Date(Date.now() + 60 * 60 * 1_000);
const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1_000);
const session = (id: string, classTypeId: string, startsAt: Date, availableSeats: number) => ({
  id,
  branchId: "branch-centro",
  classTypeId,
  trainerStaffMemberId: "trainer-1",
  classTypeName: classTypes.find((c) => c.id === classTypeId)?.name,
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000).toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
});

function baseRoutes() {
  return {
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/branches": () => jsonResponse(branches),
    "/api/v1/class-types": () => jsonResponse(classTypes),
  };
}

async function openBrowse(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await render(<App runtime={createClientRuntime(routeFetcher(routes))} />);

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByText("Reservar una clase")).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );

  return screen;
}

describe("Client Browse Sessions", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("lists today's Sessions for the first Branch with seats or a full tag", async () => {
    const screen = await openBrowse({
      ...baseRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () =>
          jsonResponse([
            session("session-1", "class-reformer", inOneHour, 3),
            session("session-2", "class-mat", inTwoHours, 0),
          ]),
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /^Reformer Pilates \d.*Emma Vargas, 3 cupos$/,
        }),
      ).toBeOnTheScreen();
    });
    expect(screen.getAllByText("Emma Vargas · 50 min")).toHaveLength(2);
    expect(screen.getByText("3 cupos")).toBeOnTheScreen();
    expect(screen.getByText("Lleno")).toBeOnTheScreen();
    expect(screen.queryByText(/clases esta semana/)).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
  });

  it("shows the classes left this week from the Session field", async () => {
    const capped = {
      ...session("session-1", "class-reformer", inOneHour, 3),
      classesLeftThisWeek: 2,
    };
    const screen = await openBrowse({
      ...baseRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([capped]),
    });

    await waitFor(() => {
      expect(screen.getByText("Te quedan 2 clases esta semana")).toBeOnTheScreen();
    });
  });

  it("filters the list by Class Type and offers every class when the filter is empty", async () => {
    const screen = await openBrowse({
      ...baseRoutes(),
      [dayUrl(today)]: () => jsonResponse([session("session-1", "class-reformer", inOneHour, 3)]),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Mat Pilates" }));

    // Walkthrough n.º 6 (A): a real empty state with an action.
    await waitFor(() => {
      expect(screen.getByText("Hoy no hay Mat Pilates")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Prueba otro día o mira todas las clases de este día."),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Reformer Pilates \d/ })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Ver todas las clases" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
  });

  it("offers the next day of the week that has the chosen Class Type", async () => {
    const later = dates[3];
    const laterStart = new Date(`${later}T12:00:00.000Z`);
    const screen = await openBrowse({
      ...baseRoutes(),
      [dayUrl(today)]: () => jsonResponse([session("session-1", "class-reformer", inOneHour, 3)]),
      [weekUrl]: () =>
        jsonResponse([
          session("session-1", "class-reformer", inOneHour, 3),
          session("session-9", "class-mat", laterStart, 4),
        ]),
      [dayUrl(later)]: () => jsonResponse([session("session-9", "class-mat", laterStart, 4)]),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Mat Pilates" }));

    const offer = `Ver el ${formatSessionDate(laterStart.toISOString()).split(" ").slice(0, 2).join(" ")}`;
    await waitFor(() => {
      expect(screen.getByRole("button", { name: offer })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: offer }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Mat Pilates \d/ })).toBeOnTheScreen();
    });
  });

  it("offers tomorrow when today has no classes at all", async () => {
    const tomorrowStart = new Date(`${dates[1]}T12:00:00.000Z`);
    const screen = await openBrowse({
      ...baseRoutes(),
      [dayUrl(today)]: () => jsonResponse([]),
      [dayUrl(dates[1])]: () =>
        jsonResponse([session("session-2", "class-reformer", tomorrowStart, 5)]),
    });

    await waitFor(() => {
      expect(screen.getByText("Este día no hay clases")).toBeOnTheScreen();
    });
    expect(screen.getByText("Elige otro día de la semana para reservar.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Ver mañana" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
  });

  it("opens the Session detail from a card", async () => {
    const detail = {
      id: "session-1",
      branch: branches[0],
      classType: classTypes[0],
      trainerName: "Emma Vargas",
      startsAt: inOneHour.toISOString(),
      endsAt: new Date(inOneHour.getTime() + 50 * 60 * 1_000).toISOString(),
      capacity: 12,
      bookedCount: 9,
      availableSeats: 3,
      waitlistCount: 0,
    };
    const screen = await openBrowse({
      ...baseRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([session("session-1", "class-reformer", inOneHour, 3)]),
      "/api/v1/sessions/session-1": () => jsonResponse(detail),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));

    await waitFor(() => {
      expect(screen.getByText("de 12 cupos libres")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Reservar" })).toBeOnTheScreen();
  });

  it("marks the selected Branch in «Elige una sucursal» (follow-up 74)", async () => {
    const screen = await openBrowse({
      ...baseRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([]),
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Sucursal: Centro" }));

    expect(screen.getByRole("button", { name: "Centro" })).toBeSelected();
    // The picker pill names the Branch too (MOB-042), so read the sheet row's label.
    expect(within(screen.getByRole("button", { name: "Centro" })).getByText("Centro")).toHaveStyle({
      color: "#8A5D59",
    });
    expect(
      screen.getByTestId("picker-check-branch-centro", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`picker-check-${branches[1]!.id}`, {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });
  it("keeps the day and class type strips at their own height while the Branch list is open", async () => {
    const screen = await openBrowse({
      ...baseRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([]),
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Sucursal: Centro" }));

    // Spare tablet height must not stretch them, nor an open list squash them.
    for (const strip of ["browse-day-strip", "browse-class-type-strip"]) {
      expect(screen.getByTestId(strip)).toHaveStyle({ flexGrow: 0, flexShrink: 0 });
    }
  });
});
