import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

// Shared Assistant fixtures for the phone and tablet flow specs.
export const minute = 60_000;
export const hour = 60 * minute;

export const assistant = {
  id: "staff-3",
  name: "Camila Rojas",
  email: "camila.rojas@example.com",
  phone: null,
  role: "assistant",
  branches: [{ id: "branch-centro", name: "Centro" }],
};

export const lucia = {
  id: "client-lucia",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: "+591 70011001",
  accountStatus: "active",
};

export const subscription = {
  id: "subscription-1",
  planName: "Paquete de 8 clases",
  originalClassAllowance: 8,
  remainingClassAllowance: 5,
  startsOn: "2026-09-12",
  endsOn: "2026-10-12",
};

export const facts = (
  sessionId: string,
  branchId: string,
  startsAt: Date,
  classTypeName = "Reformer Pilates",
) => ({
  sessionId,
  branchId,
  classTypeName,
  trainerName: "Emma Vargas",
  branchName: branchId === "branch-centro" ? "Centro" : "Urubó",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * minute).toISOString(),
});

export const farBooking = {
  kind: "booking",
  bookingId: "booking-far",
  actionable: true,
  ...facts("session-far", "branch-centro", new Date(Date.now() + 26 * hour)),
};
export const soonBooking = {
  kind: "booking",
  bookingId: "booking-soon",
  actionable: true,
  ...facts("session-soon", "branch-centro", new Date(Date.now() + 60 * minute), "Mat Pilates"),
};
export const waitlistEntry = {
  kind: "waitlist",
  waitlistEntryId: "entry-1",
  actionable: false,
  ...facts("session-urubo", "branch-urubo", new Date(Date.now() + 48 * hour), "Pilates Prenatal"),
};

export const history = [
  {
    bookingId: "past-1",
    ...facts("session-p1", "branch-centro", new Date("2026-09-15T13:00:00.000Z")),
  },
  {
    bookingId: "past-2",
    ...facts("session-p2", "branch-centro", new Date("2026-09-08T13:00:00.000Z"), "Mat Pilates"),
  },
  {
    bookingId: "past-3",
    ...facts("session-p3", "branch-centro", new Date("2026-08-20T13:00:00.000Z")),
  },
];

export const overview = {
  client: lucia,
  subscription: { status: "active", subscription },
  nextBooking: farBooking,
  recentHistory: history.slice(0, 2),
  creditAvailableCentavos: 6_000,
};

// Her last Plan has ended, so the Assistant may take cash for a new one (UX-003).
export const expiredOverview = {
  ...overview,
  subscription: {
    status: "expired",
    subscription: { ...subscription, remainingClassAllowance: 0, endsOn: "2026-09-12" },
  },
  nextBooking: null,
};

export const planQuotes = {
  creditAvailableCentavos: 6_000,
  plans: [
    {
      id: "plan-8",
      name: "Paquete de 8 clases",
      durationDays: 30,
      weeklyClassCap: null,
      durationMonths: 1,
      classAllowance: 8,
      priceCentavos: 56_000,
      creditAppliedCentavos: 6_000,
      amountDueCentavos: 50_000,
    },
    {
      id: "plan-12",
      name: "Paquete de 12 clases",
      durationDays: 30,
      weeklyClassCap: null,
      durationMonths: 1,
      classAllowance: 12,
      priceCentavos: 78_000,
      creditAppliedCentavos: 6_000,
      amountDueCentavos: 72_000,
    },
  ],
};

export const today = boliviaCivilDate(new Date());
export const { from, until } = civilDateRange(today);
export const sessionStart = new Date(Date.now() + 3 * hour);
export const session = {
  id: "session-1",
  branchId: "branch-centro",
  classTypeId: "class-reformer",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  startsAt: sessionStart.toISOString(),
  endsAt: new Date(sessionStart.getTime() + 50 * minute).toISOString(),
  capacity: 12,
  bookedCount: 6,
  availableSeats: 6,
  waitlistCount: 0,
};
export const sessionDetail = {
  id: "session-1",
  branch: { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
  classType: {
    id: "class-reformer",
    name: "Reformer Pilates",
    description: "Trabajo de fuerza y control en el reformer.",
    durationMinutes: 50,
  },
  trainerName: "Emma Vargas",
  startsAt: session.startsAt,
  endsAt: session.endsAt,
  capacity: 12,
  bookedCount: 6,
  availableSeats: 6,
  waitlistCount: 0,
};

export const newClient = {
  id: "client-new",
  name: "Ana Nueva",
  email: "ana@example.com",
  phone: "+591 70000000",
  accountStatus: "pending",
};
export const invitation = {
  clientId: "client-new",
  name: "Ana Nueva",
  email: "ana@example.com",
  phone: "+591 70000000",
  pendingExpiresAt: "2026-10-22T15:00:00.000Z",
  activationExpiresAt: "2026-09-29T15:00:00.000Z",
  cancellable: true,
};

export function assistantRoutes() {
  return {
    "/api/v1/staff-members/current": () => jsonResponse(assistant),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/assistant/clients?query=luc": () => jsonResponse([lucia]),
    "/api/v1/assistant/clients?query=zz": () => jsonResponse([]),
    "/api/v1/assistant/clients/client-lucia": () => jsonResponse(overview),
    "/api/v1/assistant/clients/client-lucia/bookings": () =>
      jsonResponse([farBooking, soonBooking, waitlistEntry]),
    "/api/v1/assistant/clients/client-lucia/class-history": () => jsonResponse(history),
    "/api/v1/assistant/clients/client-lucia/plan-quotes": () => jsonResponse(planQuotes),
    "/api/v1/branches": () =>
      jsonResponse([
        { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" },
        { id: "branch-urubo", name: "Urubó", address: "Condominio Los Tajibos" },
      ]),
    "/api/v1/class-types": () =>
      jsonResponse([
        {
          id: "class-reformer",
          name: "Reformer Pilates",
          description: "",
          durationMinutes: 50,
        },
        { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 },
      ]),
    [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
      () => jsonResponse([session]),
    "/api/v1/sessions/session-1": () => jsonResponse(sessionDetail),
  };
}

export async function openClientSearch(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(routes), "assistant")} />,
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen();
  });
  return screen;
}

export async function openLucia(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await openClientSearch(routes);
  await fireEvent.changeText(
    screen.getByPlaceholderText("Buscar por nombre, teléfono o correo"),
    "luc",
  );
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Ver cliente Lucía Fernández" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Lucía Fernández")).toBeOnTheScreen();
  });
  return screen;
}
