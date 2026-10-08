import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { boliviaCivilDate, civilDateRange } from "@pilates/mobile-core";

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
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    expect(screen.getAllByText("Emma Vargas")).toHaveLength(2);
    expect(screen.getByText("3 cupos")).toBeOnTheScreen();
    expect(screen.getByText("Lleno")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
  });

  it("filters the list by Class Type and shows an empty state", async () => {
    const screen = await openBrowse({
      ...baseRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([session("session-1", "class-reformer", inOneHour, 3)]),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Mat Pilates" }));

    await waitFor(() => {
      expect(screen.getByText("No hay clases con este filtro")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: /^Reformer Pilates \d/ })).not.toBeOnTheScreen();
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
      expect(screen.getByText("3 de 12 cupos disponibles")).toBeOnTheScreen();
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
