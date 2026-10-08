import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

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
const facts = (startsAt: Date) => ({
  startsAt: startsAt.toISOString(),
  endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000).toISOString(),
});
const insideWindow = {
  kind: "booking",
  bookingId: "booking-soon",
  sessionId: "session-soon",
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  branchName: "Urubó",
  ...facts(new Date(Date.now() + hour)),
};
const alternative = {
  id: "session-alt",
  branchId: "branch-centro",
  classTypeId: "class-reformer",
  trainerStaffMemberId: "trainer-1",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  ...facts(new Date(Date.now() + 3 * hour)),
  capacity: 12,
  bookedCount: 4,
  availableSeats: 8,
  waitlistCount: 0,
};

// MOB-048: 06's option is the shared Session card: the spaced time over the
// Lora title, then the Trainer after the person icon and the seat pill under
// the rule; no chevron, and a 2px Palo de rosa border once selected.
describe("Client reschedule option card", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  async function openReschedule() {
    // The Booking's own civil day, not today's: within an hour of midnight in
    // Bolivia the Booking already falls on tomorrow.
    const { from, until } = civilDateRange(boliviaCivilDate(new Date(insideWindow.startsAt)));
    const screen = await render(
      <App
        runtime={createClientRuntime(
          routeFetcher({
            "/api/v1/clients/current": () => jsonResponse(profile),
            "/api/v1/clients/current/subscription": () => jsonResponse(active),
            "/api/v1/bookings": () => jsonResponse([insideWindow]),
            "/api/v1/branches": () =>
              jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle 1" }]),
            [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`]:
              () => jsonResponse([alternative]),
          }),
        )}
      />,
    );
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Mis Reservas, tab/ })).toBeOnTheScreen();
      },
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen();
    });
    // Mis reservas stays mounted under 06 with its own Trainer line, so the
    // assertions stay inside the option card.
    const button = screen.getByRole("button", { name: /^Reformer Pilates \d/ });
    return { button, card: within(button), screen };
  }

  it("draws the option as the frame's card with the seat pill in the footer", async () => {
    const { button, card } = await openReschedule();

    expect(button).toHaveStyle({
      backgroundColor: "#FFFFFF",
      borderColor: "#D8C9BB",
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
    });
    expect(card.getByText(/^\d\d:\d\d – \d\d:\d\d$/)).toHaveStyle({
      color: "#766D69",
      fontSize: 12,
      fontWeight: "500",
      letterSpacing: 1.2,
    });
    expect(card.getByText("Reformer Pilates")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 19,
    });
    expect(card.getByTestId("card-footer")).toHaveStyle({
      borderTopColor: "#EFE7DE",
      paddingTop: 12,
    });
    expect(card.getByTestId("glyph-person", hidden)).toHaveProp("width", 17);
    expect(card.getByText("Emma Vargas")).toHaveStyle({ color: "#6E6663", fontSize: 14 });
    expect(card.getByTestId("seat-pill")).toHaveStyle({
      backgroundColor: "#EFE0DC",
      borderRadius: 999,
    });
    expect(card.getByText("8 cupos")).toHaveStyle({
      color: "#7A4F4B",
      fontSize: 12,
      fontWeight: "500",
    });
    expect(card.queryByTestId("chevron", hidden)).toBeNull();
  });

  it("marks the selected option by its 2px Palo de rosa border", async () => {
    const { button, screen } = await openReschedule();

    await fireEvent.press(button);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveProp(
        "accessibilityState",
        { selected: true },
      );
    });
    expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveStyle({
      borderColor: "#B78380",
      borderWidth: 2,
    });
  });
});
