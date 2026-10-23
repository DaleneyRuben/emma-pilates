import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
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
const hour = 60 * 60 * 1_000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs);
const facts = (startsAt: Date) => ({
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000).toISOString(),
});
const cancellable = {
  kind: "booking",
  bookingId: "booking-far",
  sessionId: "session-far",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  branchName: "Centro",
  ...facts(at(26 * hour)),
};
const insideWindow = {
  kind: "booking",
  bookingId: "booking-soon",
  sessionId: "session-soon",
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  branchName: "Urubó",
  ...facts(at(1 * hour)),
};

const problem = (code: string) => jsonResponse({ code, status: 409, title: "Conflict" }, 409);

async function openMyBookings(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await render(<App runtime={createClientRuntime(routeFetcher(routes))} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /Mis Reservas, tab/ })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));
  await waitFor(() => {
    expect(screen.getByText("Mis reservas")).toBeOnTheScreen();
  });
  return screen;
}

describe("Client booking rejection messages", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it.each([
    [
      "booking_cancellation_window",
      "Ya no se puede cancelar: falta menos que la ventana de cancelación.",
    ],
    ["weekly_class_cap_reached", "Ya alcanzaste el máximo de clases de esta semana."],
    [
      "subscription_not_started",
      "Tu plan todavía no empieza: podrás reservar desde su fecha de inicio.",
    ],
  ])("names a refused cancellation by %s", async (code, message) => {
    const screen = await openMyBookings({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(active),
      "/api/v1/bookings": () => jsonResponse([cancellable]),
      "DELETE /api/v1/bookings/booking-far": () => problem(code),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar reserva" }));

    await waitFor(() => {
      expect(screen.getByText(message)).toBeOnTheScreen();
    });
    expect(
      screen.queryByText("No pudimos cancelar la reserva. Inténtalo de nuevo."),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ["reschedule_outside_window", "Solo puedes reprogramar dentro de la ventana de cancelación."],
    ["reschedule_target_ineligible", "Esa clase no está disponible para reprogramar."],
    ["session_full", "La clase ya no tiene cupos."],
    ["weekly_class_cap_reached", "Ya alcanzaste el máximo de clases de esta semana."],
    [
      "subscription_not_started",
      "Tu plan todavía no empieza: podrás reservar desde su fecha de inicio.",
    ],
  ])("names a refused reschedule by %s", async (code, message) => {
    const { from, until } = civilDateRange(boliviaCivilDate(new Date(insideWindow.startsAt)));
    const alternative = {
      id: "session-alt",
      branchId: "branch-centro",
      classTypeId: "class-reformer",
      trainerStaffMemberId: "trainer-1",
      classTypeName: "Reformer Pilates",
      trainerName: "Emma Vargas",
      ...facts(at(3 * hour)),
      capacity: 12,
      bookedCount: 4,
      availableSeats: 8,
      waitlistCount: 0,
    };
    const screen = await openMyBookings({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(active),
      "/api/v1/bookings": () => jsonResponse([insideWindow]),
      "/api/v1/branches": () =>
        jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle 1" }]),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([alternative]),
      "POST /api/v1/bookings/booking-soon/reschedule": () => problem(code),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));

    await waitFor(() => {
      expect(screen.getByText(message)).toBeOnTheScreen();
    });
    expect(
      screen.queryByText("No pudimos reprogramar la reserva. Inténtalo de nuevo."),
    ).not.toBeOnTheScreen();
  });
});
