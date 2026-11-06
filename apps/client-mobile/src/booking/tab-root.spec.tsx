import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { openDetail } from "./session-detail-test-support";

jest.setTimeout(20_000);

// Walkthrough n.º 28 (owner: «es poco intuitivo»): after booking, the
// Reservar tab showed the last class detail instead of the day strip. A tab
// always opens on its own root screen.
describe("The Client tabs", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("opens Reservar on the day strip after a booking, not on the class", async () => {
    const { screen } = await openDetail({
      "POST /api/v1/sessions/session-1/bookings": () => jsonResponse({ id: "booking-1" }, 201),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Reservar" }));
    await waitFor(() => {
      expect(screen.getByText("Reserva confirmada")).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /Reservar, tab/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    expect(screen.queryByText("Sobre la clase")).toBeNull();
  });
});
