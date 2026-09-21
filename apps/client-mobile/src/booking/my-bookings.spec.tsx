import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { boliviaCivilDate, civilDateRange } from "./session-format";

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
const waitlisted = {
  kind: "waitlist",
  waitlistEntryId: "entry-1",
  sessionId: "session-wait",
  classTypeName: "Pilates Prenatal",
  trainerName: "Andrea Suárez",
  branchName: "Equipetrol",
  ...facts(at(30 * hour)),
};

function baseRoutes(upcoming: () => unknown[]) {
  return {
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/bookings": () => jsonResponse(upcoming()),
  };
}

async function openMyBookings(routes: Parameters<typeof routeFetcher>[0]) {
  const screen = await render(
    <App runtime={createClientRuntime(routeFetcher(routes))} />,
  );

  await waitFor(
    () => {
      expect(
        screen.getByRole("button", { name: /Mis Reservas, tab/ }),
      ).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));
  await waitFor(
    () => {
      expect(screen.getByText("Mis reservas")).toBeOnTheScreen();
    },
    { timeout: 5_000 },
  );

  return screen;
}

describe("Client My Bookings", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("shows the three card states with their actions", async () => {
    const screen = await openMyBookings(
      baseRoutes(() => [insideWindow, cancellable, waitlisted]),
    );

    await waitFor(() => {
      expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
    });
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
    expect(screen.getByText("No cancelable")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(screen.getByText("En lista de espera")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Salir de la lista de espera" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ver historial" })).toBeOnTheScreen();
  });

  it("shows an empty state that leads to booking", async () => {
    const screen = await openMyBookings(baseRoutes(() => []));

    await waitFor(() => {
      expect(
        screen.getByText("Aún no tienes reservas próximas."),
      ).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: "Reservar una clase" }));

    await waitFor(() => {
      expect(screen.getByText("Reservar una clase")).toBeOnTheScreen();
    });
  });

  it("cancels a Booking after confirming", async () => {
    let upcoming = [cancellable];
    const cancelled = jest.fn();
    const screen = await openMyBookings({
      ...baseRoutes(() => upcoming),
      "DELETE /api/v1/bookings/booking-far": () => {
        cancelled();
        upcoming = [];
        return new Response(null, { status: 204 });
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(screen.getByText("¿Cancelar esta reserva?")).toBeOnTheScreen();
    });
    fireEvent.press(
      screen.getByRole("button", { name: "Sí, cancelar reserva" }),
    );

    await waitFor(() => {
      expect(cancelled).toHaveBeenCalled();
      expect(screen.queryByText("Reformer Pilates")).not.toBeOnTheScreen();
    });
  });

  it("leaves the Waitlist without confirmation", async () => {
    let upcoming = [waitlisted];
    const left = jest.fn();
    const screen = await openMyBookings({
      ...baseRoutes(() => upcoming),
      "DELETE /api/v1/waitlist-entries/entry-1": () => {
        left();
        upcoming = [];
        return new Response(null, { status: 204 });
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Salir de la lista de espera" }),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      screen.getByRole("button", { name: "Salir de la lista de espera" }),
    );

    await waitFor(() => {
      expect(left).toHaveBeenCalled();
      expect(screen.queryByText("Pilates Prenatal")).not.toBeOnTheScreen();
    });
  });

  it("reschedules a Booking inside the Cancellation Window to a same-day Session", async () => {
    const today = boliviaCivilDate(new Date());
    const { from, until } = civilDateRange(today);
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
    let upcoming = [insideWindow];
    const rescheduled = jest.fn();
    const screen = await openMyBookings({
      ...baseRoutes(() => upcoming),
      "/api/v1/branches": () =>
        jsonResponse([
          { id: "branch-centro", name: "Centro", address: "Calle 1" },
        ]),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([alternative]),
      "POST /api/v1/bookings/booking-soon/reschedule": (init) => {
        rescheduled(JSON.parse(String(init?.body)));
        upcoming = [
          { ...insideWindow, bookingId: "booking-new", ...facts(at(3 * hour)) },
        ];
        return jsonResponse({ id: "booking-new" }, 201);
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));

    await waitFor(() => {
      expect(screen.getByText("Reprogramar clase")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Puedes cambiar a otra clase disponible el mismo día."),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Confirmar cambio" }),
    ).toHaveProp("accessibilityState", { disabled: true });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Reformer Pilates \d/ }),
      ).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));
    fireEvent.press(screen.getByRole("button", { name: "Confirmar cambio" }));

    await waitFor(() => {
      expect(rescheduled).toHaveBeenCalledWith({ targetSessionId: "session-alt" });
      expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen();
    });
  });
});
