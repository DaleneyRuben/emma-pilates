import { act, cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { detail, endsAt, openDetail, startsAt } from "./session-detail-test-support";

jest.setTimeout(20_000);

const thisClass = {
  relation: "this_class",
  bookingId: "booking-1",
  classTypeName: "Reformer Pilates",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
};
const overlapping = { ...thisClass, relation: "overlapping", bookingId: "booking-2" };

// Review of walkthrough n.º 1: a booking changed elsewhere never leaves the
// class detail showing the old footer.
describe("Client Session detail keeping her own Booking current", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("reads her booking again when she comes back from Mis reservas", async () => {
    let yourBooking: typeof overlapping | null = overlapping;
    const { screen } = await openDetail({
      "/api/v1/sessions/session-1": () => jsonResponse({ ...detail(3), yourBooking }),
      "/api/v1/bookings": () => jsonResponse([]),
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeDisabled(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Ver esa reserva" }));
    await waitFor(() => expect(screen.getByText("Aún no tienes reservas")).toBeOnTheScreen());
    // She cancelled that other class meanwhile.
    yourBooking = null;
    await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));

    // Leaving Reservar closed the detail; opening the class reads it again.
    await fireEvent.press(await screen.findByRole("button", { name: /^Reformer Pilates \d/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeEnabled(),
    );
    expect(screen.queryByText("Ver esa reserva")).toBeNull();
  });

  it("says why the studio refused the cancellation", async () => {
    const { screen } = await openDetail({
      "/api/v1/sessions/session-1": () => jsonResponse({ ...detail(3), yourBooking: thisClass }),
      "DELETE /api/v1/bookings/booking-1": () =>
        jsonResponse({ code: "booking_cancellation_window", detail: "closed" }, 409),
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar reserva" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, cancelar reserva" }));

    expect(
      await screen.findByText(
        "Ya no se puede cancelar: falta menos que la ventana de cancelación.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ya reservaste esta clase")).toBeOnTheScreen();
  });

  // Review: two taps in the same frame both saw «busy» still false and sent
  // two cancellations; a ref lets only the first through.
  it("cancels once however fast «Sí, cancelar reserva» is tapped", async () => {
    let deletes = 0;
    const { screen } = await openDetail({
      "/api/v1/sessions/session-1": () => jsonResponse({ ...detail(3), yourBooking: thisClass }),
      "DELETE /api/v1/bookings/booking-1": () => {
        deletes += 1;
        return new Response(null, { status: 204 });
      },
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar reserva" }));
    const confirm = await screen.findByRole("button", { name: "Sí, cancelar reserva" });

    await act(async () => {
      confirm.props.onClick();
      confirm.props.onClick();
    });

    await waitFor(() => expect(deletes).toBeGreaterThan(0));
    expect(deletes).toBe(1);
  });
});
