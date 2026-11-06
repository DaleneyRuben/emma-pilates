import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, minute, openLucia, session, sessionDetail } from "./assistant-fixtures";

jest.setTimeout(20_000);

// Tomorrow at 10:00 in Bolivia, outside every cancellation window.
const tomorrow = boliviaCivilDate(new Date(Date.now() + 24 * 60 * minute));
const startsAt = new Date(`${tomorrow}T10:00:00-04:00`);
const times = {
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * minute).toISOString(),
};
const { from, until } = civilDateRange(tomorrow);

// Seen on the emulator (MOB-074): «Reserva confirmada» stayed over «No tiene
// reservas próximas» after the Assistant cancelled the booking she had made.
describe("the Assistant's booking toast after a cancellation", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("closes once the booking is cancelled", async () => {
    let bookings: unknown[] = [];
    const screen = await openLucia({
      ...assistantRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
        () => jsonResponse([{ ...session, ...times }]),
      "/api/v1/sessions/session-1": () => jsonResponse({ ...sessionDetail, ...times }),
      "POST /api/v1/sessions/session-1/bookings": () => {
        bookings = [
          {
            kind: "booking",
            bookingId: "booking-new",
            actionable: true,
            sessionId: "session-1",
            branchId: "branch-centro",
            branchName: "Centro",
            classTypeName: "Reformer Pilates",
            trainerName: "Emma Vargas",
            ...times,
          },
        ];
        return jsonResponse({ id: "booking-new" }, 201);
      },
      "/api/v1/assistant/clients/client-lucia/bookings": () => jsonResponse(bookings),
      "DELETE /api/v1/bookings/booking-new": () => {
        bookings = [];
        return new Response(null, { status: 204 });
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() => expect(screen.getByTestId(`assistant-day-${tomorrow}`)).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId(`assistant-day-${tomorrow}`));
    await fireEvent.press(await screen.findByRole("button", { name: /^Reformer Pilates \d/ }));
    await fireEvent.press(await screen.findByRole("button", { name: "Reservar para Lucía" }));
    await waitFor(() => expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen());

    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar reserva" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, cancelar la reserva" }));

    await waitFor(() => expect(screen.getByText("No tiene reservas próximas")).toBeOnTheScreen());
    expect(screen.queryByText("Reserva confirmada")).toBeNull();
    // Walkthrough n.º 29: the cancellation is confirmed, as a booking is.
    await waitFor(() => expect(screen.getByText("Reserva cancelada")).toBeOnTheScreen());
    expect(screen.getByText("La clase volvió a su plan")).toBeOnTheScreen();
  });
});
