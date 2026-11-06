// Shared by the Session detail specs: a Client opening «Reformer Pilates» from Reservar.
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { boliviaCivilDate, civilDateRange } from "@pilates/mobile-core";

export const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

export const subscription = (remaining: number) => ({
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: remaining,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
});

export const branch = { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" };
export const classType = {
  id: "class-reformer",
  name: "Reformer Pilates",
  description: "Clase de Pilates con Reformer, ideal para tonificar todo el cuerpo.",
  // Deprecated: the Session's own minutes come from startsAt and endsAt
  // (WEB-027, booking ADR-0004).
  durationMinutes: 60,
};
// Outside the seeded 2 h 30 window, so a full Session still offers the Waitlist.
export const startsAt = new Date(Date.now() + 4 * 60 * 60 * 1_000);
export const endsAt = new Date(startsAt.getTime() + 75 * 60 * 1_000);
export const insideWindowStartsAt = new Date(Date.now() + 60 * 60 * 1_000);
const { from, until } = civilDateRange(boliviaCivilDate(new Date()));
const listUrl = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

export const listed = (availableSeats: number) => ({
  id: "session-1",
  branchId: branch.id,
  classTypeId: classType.id,
  trainerStaffMemberId: "trainer-1",
  classTypeName: classType.name,
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
});

export const detail = (availableSeats: number, classesLeftThisWeek?: number | null) => ({
  id: "session-1",
  branch,
  classType,
  trainerName: "Emma Vargas",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  capacity: 12,
  bookedCount: 12 - availableSeats,
  availableSeats,
  waitlistCount: 0,
  ...(classesLeftThisWeek === undefined ? {} : { classesLeftThisWeek }),
});

export async function openDetail(
  routes: Parameters<typeof routeFetcher>[0],
  remaining = 5,
  availableSeats = 3,
  runtime: Parameters<typeof createClientRuntime>[1] = {},
  sessionStartsAt = startsAt,
) {
  let subscriptionRemaining = remaining;
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(subscription(subscriptionRemaining)),
    "/api/v1/branches": () => jsonResponse([branch]),
    "/api/v1/class-types": () => jsonResponse([classType]),
    [listUrl]: () =>
      jsonResponse([
        {
          ...listed(availableSeats),
          startsAt: sessionStartsAt.toISOString(),
          endsAt: new Date(sessionStartsAt.getTime() + 75 * 60 * 1_000).toISOString(),
        },
      ]),
    "/api/v1/sessions/session-1": () =>
      jsonResponse({
        ...detail(availableSeats),
        startsAt: sessionStartsAt.toISOString(),
        endsAt: new Date(sessionStartsAt.getTime() + 75 * 60 * 1_000).toISOString(),
      }),
    ...routes,
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher, runtime)} />);

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
  await waitFor(() => {
    expect(screen.getByText("Sobre la clase")).toBeOnTheScreen();
  });

  return {
    screen,
    fetcher,
    consumeAllowance: () => {
      subscriptionRemaining -= 1;
    },
  };
}
