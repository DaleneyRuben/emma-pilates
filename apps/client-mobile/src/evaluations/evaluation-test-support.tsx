import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, dayChipLabel } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

// Shared Client Evaluation fixtures for the evaluation specs.
export const hour = 60 * 60 * 1_000;
export const day = 24 * hour;
export const minute = 60 * 1_000;

export const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

export const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-12-11",
  },
};

// Bolivia wall clock 09:30 on a civil date, as a UTC instant.
export const boliviaInstant = (civilDate: string, time: string) =>
  new Date(`${civilDate}T${time}:00.000-04:00`);

export const dayName = (civilDate: string) => {
  const label = dayChipLabel(civilDate);
  return `${label.weekday} ${label.day}`;
};

export const civilDateIn = (days: number) => boliviaCivilDate(new Date(Date.now() + days * day));

export const slot = (
  id: string,
  civilDate: string,
  time: string,
  overrides: Record<string, unknown> = {},
) => {
  const startsAt = boliviaInstant(civilDate, time);
  return {
    id,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 45 * minute).toISOString(),
    durationMinutes: 45,
    branchId: "branch-centro",
    branchName: "Centro",
    nutritionistName: "Gabriela Rojas",
    bookable: true,
    ...overrides,
  };
};

export const firstDay = civilDateIn(3);
export const secondDay = civilDateIn(4);
export const fullDay = civilDateIn(5);

export const availability = {
  days: [
    {
      date: firstDay,
      slots: [slot("slot-1", firstDay, "09:00"), slot("slot-2", firstDay, "09:45")],
    },
    { date: secondDay, slots: [slot("slot-3", secondDay, "15:00")] },
    {
      date: fullDay,
      slots: [slot("slot-4", fullDay, "10:00", { bookable: false })],
    },
  ],
  months: [{ month: `${firstDay.slice(0, 7)}-01`, status: "available", evaluation: null }],
};

export const upcomingEvaluation = (
  id: string,
  startsAt: Date,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  slotId: `slot-of-${id}`,
  state: "booked",
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 45 * minute).toISOString(),
  durationMinutes: 45,
  branchId: "branch-centro",
  branchName: "Centro",
  nutritionistName: "Gabriela Rojas",
  cancellableUntil: new Date(startsAt.getTime() - 3 * hour).toISOString(),
  cancellable: startsAt.getTime() - Date.now() > 3 * hour,
  ...overrides,
});

export const page = (items: unknown[]) => ({ items, hasMore: false, nextCursor: null });

export function baseRoutes(overrides: Parameters<typeof routeFetcher>[0] = {}) {
  return {
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/clients/current/credit": () =>
      jsonResponse({ availableCentavos: 0, reservedCentavos: 0 }),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/evaluation-slots": () => jsonResponse(availability),
    "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([])),
    "/api/v1/evaluations?scope=past": () => jsonResponse(page([])),
    ...overrides,
  };
}

export async function openProfileRow(
  fetcher: typeof globalThis.fetch,
  row: "Evaluación nutricional" | "Mis evaluaciones",
  runtime: Parameters<typeof createClientRuntime>[1] = {},
) {
  const screen = await render(<App runtime={createClientRuntime(fetcher, runtime)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /^Perfil, .*tab/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /^Perfil, .*tab/ }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: row })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: row }));
  return screen;
}

// The first-day civil date of the Bolivia month `offset` months from today.
export const monthOfToday = (offset: number): string => {
  const [year, month] = boliviaCivilDate(new Date()).split("-").map(Number);
  const first = new Date(Date.UTC(year!, month! - 1 + offset, 1, 12));
  return first.toISOString().slice(0, 10);
};

// "noviembre" for "2026-11-01".
export const spanishMonth = (month: string): string =>
  new Intl.DateTimeFormat("es-BO", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}T12:00:00.000Z`),
  );
