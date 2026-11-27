import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache, formatStartTime } from "@pilates/mobile-core";

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
const otherStartsAt = new Date(startsAt.getTime() - 30 * 60 * 1_000);
const overlapping = {
  relation: "overlapping",
  bookingId: "booking-2",
  classTypeName: "Mat Pilates",
  startsAt: otherStartsAt.toISOString(),
  endsAt: new Date(otherStartsAt.getTime() + 60 * 60 * 1_000).toISOString(),
};

// Walkthrough n.º 1 (C04p, C04q): the class detail knows, when it opens,
// that she booked this class or holds another one at that time.
describe("Client Session detail with her own Booking", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("offers to cancel the class she already booked (C04p)", async () => {
    const cancelled = jest.fn();
    let yourBooking: typeof thisClass | null = thisClass;
    const { screen } = await openDetail({
      "/api/v1/sessions/session-1": () => jsonResponse({ ...detail(3), yourBooking }),
      "DELETE /api/v1/bookings/booking-1": () => {
        cancelled();
        yourBooking = null;
        return new Response(null, { status: 204 });
      },
    });

    const footer = within(screen.getByTestId("session-footer"));
    await waitFor(() => expect(footer.getByText("Ya reservaste esta clase")).toBeOnTheScreen());
    // C04p: a check before the status; the free line ends with its period.
    expect(
      footer.getByTestId("own-booking-check", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      footer.getByText(/^Cancelas gratis hasta (hoy|mañana|el) .*a las \d\d:\d\d\.$/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reservar esta clase" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar reserva" }));
    await waitFor(() => expect(screen.getByText("¿Cancelar esta reserva?")).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar reserva" }));

    await waitFor(() => expect(cancelled).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeEnabled(),
    );
    expect(screen.queryByText("Ya reservaste esta clase")).toBeNull();
  });

  it("says she holds another class at that time and opens it (C04q)", async () => {
    const { screen } = await openDetail({
      "/api/v1/sessions/session-1": () => jsonResponse({ ...detail(3), yourBooking: overlapping }),
      "/api/v1/bookings": () => jsonResponse([]),
    });

    const reason = `Ya tienes Mat Pilates a las ${formatStartTime(overlapping.startsAt)} ese día. Cancélala antes si prefieres esta.`;
    await waitFor(() => expect(screen.getByText(reason)).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reservar esta clase" })).toHaveProp(
      "accessibilityHint",
      reason,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Ver esa reserva" }));
    // Mis reservas opens on its upcoming list (empty here).
    await waitFor(() => expect(screen.getByText("Aún no tienes reservas")).toBeOnTheScreen());
  });
});
