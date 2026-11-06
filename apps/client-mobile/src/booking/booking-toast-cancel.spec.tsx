import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};
const branch = { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" };
const classType = { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 };

// Tomorrow at 10:00 in Bolivia, outside every cancellation window.
const tomorrow = boliviaCivilDate(new Date(Date.now() + 24 * 60 * 60 * 1_000));
const startsAt = new Date(`${tomorrow}T10:00:00-04:00`);
const endsAt = new Date(startsAt.getTime() + 50 * 60 * 1_000);
const { from, until } = civilDateRange(tomorrow);
const session = {
  id: "session-1",
  branchId: branch.id,
  classTypeId: classType.id,
  trainerStaffMemberId: "trainer-1",
  classTypeName: classType.name,
  trainerName: "Daniela Ortiz",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  capacity: 14,
  bookedCount: 0,
  availableSeats: 14,
  waitlistCount: 0,
};

// Seen on the emulator (MOB-074): «Reserva confirmada · Te quedan 5 clases»
// stayed over «Aún no tienes reservas» after the same booking was cancelled.
describe("the booking toast after a cancellation", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("closes once the Client cancels a booking", async () => {
    let remaining = 5;
    let upcoming: unknown[] = [];
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({
          status: "active",
          subscription: {
            id: "subscription-1",
            planName: "Paquete de 8 clases",
            originalClassAllowance: 8,
            remainingClassAllowance: remaining,
            startsOn: "2026-10-30",
            endsOn: "2026-11-29",
          },
        }),
      "/api/v1/branches": () => jsonResponse([branch]),
      "/api/v1/class-types": () => jsonResponse([classType]),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([session]),
      "/api/v1/sessions/session-1": () =>
        jsonResponse({ ...session, branch, classType, trainerName: "Daniela Ortiz" }),
      "POST /api/v1/sessions/session-1/bookings": () => {
        remaining -= 1;
        upcoming = [
          {
            kind: "booking",
            bookingId: "booking-1",
            sessionId: "session-1",
            classTypeName: classType.name,
            trainerName: "Daniela Ortiz",
            branchName: branch.name,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
          },
        ];
        return jsonResponse({ id: "booking-1" }, 201);
      },
      "/api/v1/bookings": () => jsonResponse(upcoming),
      "DELETE /api/v1/bookings/booking-1": () => {
        remaining += 1;
        upcoming = [];
        return new Response(null, { status: 204 });
      },
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(
      () => expect(screen.getByRole("button", { name: /Reservar, tab/ })).toBeOnTheScreen(),
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));
    await waitFor(() => expect(screen.getByTestId(`browse-day-${tomorrow}`)).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId(`browse-day-${tomorrow}`));
    await waitFor(
      () => expect(screen.getByRole("button", { name: /^Mat Pilates \d/ })).toBeOnTheScreen(),
      { timeout: 5_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Mat Pilates \d/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reservar" })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await waitFor(() => expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen());

    const notNow = screen.queryByRole("button", { name: "Ahora no" });
    if (notNow !== null) await fireEvent.press(notNow);
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar reserva" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, cancelar reserva" }));

    // Walkthrough n.º 29: the cancellation says so, like a booking does; a
    // cancellation the API accepts always gives the class back. The count is
    // the refreshed one from its first frame (review of FIX-043).
    await waitFor(() => expect(screen.getByText("Reserva cancelada")).toBeOnTheScreen());
    expect(screen.getByText("La clase volvió a tu plan · Te quedan 5 clases")).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText("Aún no tienes reservas")).toBeOnTheScreen());
    expect(screen.queryByText("Reserva confirmada")).toBeNull();
  });
});
