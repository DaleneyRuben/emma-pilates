import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const profile = {
  id: "client-sofia",
  name: "Sofía Rojas",
  email: "sofia@example.com",
  phone: null,
  referralCode: "REF-SOFIA",
};
const branch = { id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" };
const classType = { id: "class-mat", name: "Mat Pilates", description: "", durationMinutes: 50 };

const today = boliviaCivilDate(new Date());
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

/**
 * Owner's iPhone, 2026-11-28: Sofía used her Guest Pass class, then bought
 * «Trimestral 36 clases» from tomorrow (FIX-019). The Guest Pass is still the
 * Subscription in force today, but a class from tomorrow consumes the Plan.
 */
async function bookOnThePlanBoughtOverAGuestPass() {
  let planLeft = 34;
  let upcoming: unknown[] = [];
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () =>
      jsonResponse({
        status: "active",
        subscription: {
          id: "guest-pass",
          planName: "Pase de invitada",
          originalClassAllowance: 1,
          remainingClassAllowance: 0,
          startsOn: today,
          endsOn: tomorrow,
          guestPass: { usedClassStartsAt: new Date().toISOString() },
        },
        nextSubscription: {
          id: "quarterly",
          planName: "Trimestral 36 clases",
          originalClassAllowance: 36,
          remainingClassAllowance: planLeft,
          startsOn: tomorrow,
          endsOn: "2027-02-27",
        },
      }),
    "/api/v1/branches": () => jsonResponse([branch]),
    "/api/v1/class-types": () => jsonResponse([classType]),
    [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
      () => jsonResponse([session]),
    "/api/v1/sessions/session-1": () =>
      jsonResponse({ ...session, branch, classType, yourBooking: null }),
    "POST /api/v1/sessions/session-1/bookings": () => {
      planLeft -= 1;
      upcoming = [
        {
          kind: "booking",
          bookingId: "booking-1",
          subscriptionId: "quarterly",
          sessionId: "session-1",
          classTypeName: classType.name,
          trainerName: "Daniela Ortiz",
          branchName: branch.name,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
        },
      ];
      return jsonResponse({ id: "booking-1", subscriptionId: "quarterly" }, 201);
    },
    "/api/v1/bookings": () => jsonResponse(upcoming),
    "DELETE /api/v1/bookings/booking-1": () => {
      planLeft += 1;
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
  await fireEvent.press(await screen.findByRole("button", { name: /^Mat Pilates \d/ }));
  await waitFor(() => expect(screen.getByText("Usarás 1 de tus 34 clases.")).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: "Reservar esta clase" }));
  await waitFor(() => expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen());

  return screen;
}

describe("the booking toasts on a Plan bought over a Guest Pass", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("confirms the class from the Plan it consumed, not the free class", async () => {
    const screen = await bookOnThePlanBoughtOverAGuestPass();

    expect(screen.getByText("Te quedan 33 clases en tu plan")).toBeOnTheScreen();
    expect(screen.queryByText(/Usaste tu clase gratis/)).toBeNull();
  });

  it("gives the cancelled class back to that Plan, not the Guest Pass", async () => {
    const screen = await bookOnThePlanBoughtOverAGuestPass();
    const notNow = screen.queryByRole("button", { name: "Ahora no" });
    if (notNow !== null) await fireEvent.press(notNow);

    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar reserva" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, cancelar reserva" }));

    await waitFor(() => expect(screen.getByText("Reserva cancelada")).toBeOnTheScreen());
    expect(screen.getByText("La clase volvió a tu plan · Te quedan 34 clases")).toBeOnTheScreen();
    expect(screen.queryByText("Tu pase de invitada vuelve a estar disponible.")).toBeNull();
  });
});
