import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

// Shared Nutritionist fixtures for the agenda and availability specs.
export const hour = 60 * 60 * 1_000;
export const day = 24 * hour;
export const today = boliviaCivilDate(new Date());
export const inDays = (days: number) => boliviaCivilDate(new Date(Date.now() + days * day));

export const centro = { id: "branch-centro", name: "Centro" };
export const urubo = { id: "branch-urubo", name: "Urubó" };

export const profile = (branches = [centro]) => ({
  id: "staff-gabriela",
  name: "Gabriela Rojas",
  email: "gabriela.rojas@example.com",
  phone: null,
  role: "nutritionist",
  branches,
});

export const at = (civilDate: string, time: string) =>
  new Date(`${civilDate}T${time}:00.000-04:00`).toISOString();

export const entry = (
  evaluationId: string,
  civilDate: string,
  time: string,
  clientName: string,
  kind: "first" | "follow_up",
) => ({
  evaluationId,
  clientName,
  startsAt: at(civilDate, time),
  endsAt: new Date(new Date(at(civilDate, time)).getTime() + 45 * 60_000).toISOString(),
  durationMinutes: 45,
  branchId: centro.id,
  branchName: centro.name,
  kind,
});

export const block = (overrides: Record<string, unknown> = {}) => ({
  id: "block-monday",
  branchId: centro.id,
  branchName: centro.name,
  weekday: 1,
  startsAtLocal: "09:00",
  endsAtLocal: "13:00",
  effectiveFrom: "2026-09-01",
  effectiveUntil: null,
  slotsPerWeek: 5,
  upcomingBookedCount: 2,
  ...overrides,
});

export const page = (items: unknown[]) => ({ items, hasMore: false, nextCursor: null });

export function routes(overrides: Parameters<typeof routeFetcher>[0] = {}) {
  return {
    "/api/v1/staff-members/current": () => jsonResponse(profile()),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
    "/api/v1/nutritionist/evaluations": () => jsonResponse(page([])),
    "/api/v1/nutritionist/availability-blocks": () => jsonResponse([]),
    ...overrides,
  };
}

export async function openApp(fetcher: typeof globalThis.fetch) {
  const screen = await render(
    <App runtime={createStaffRuntime(fetcher, "nutritionist")} />,
  );
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Mi disponibilidad" })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  return screen;
}

export async function openAvailability(fetcher: typeof globalThis.fetch) {
  const screen = await openApp(fetcher);
  await fireEvent.press(screen.getByRole("button", { name: "Mi disponibilidad" }));
  await waitFor(() => {
    expect(screen.getAllByRole("button", { name: "Nuevo horario" })[0]).toBeOnTheScreen();
  });
  return screen;
}
