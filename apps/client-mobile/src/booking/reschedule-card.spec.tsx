import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
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

  // C06: the options are rows of one Lino group, the start in Lora 20 and
  // «Trainer · N cupos» under the class, with a radio at the end.
  it("draws the option as a row of the Lino group with its radio", async () => {
    const { button, card, screen } = await openReschedule();

    expect(screen.getByTestId("reschedule-options")).toHaveStyle({
      backgroundColor: "#F5EFE9",
      borderRadius: 16,
    });
    expect(button).toHaveStyle({ minHeight: 64 });
    expect(card.getByText(/^\d\d:\d\d$/)).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 20,
    });
    expect(card.getByText("Reformer Pilates")).toHaveStyle({ fontSize: 15 });
    expect(card.getByText("Emma Vargas · 8 cupos")).toHaveStyle({
      color: "#6F6662",
      fontSize: 13,
    });
    expect(card.getByTestId("reschedule-radio")).toBeOnTheScreen();
  });

  it("marks the selected option on Rosa tinte with a filled radio", async () => {
    const { button, screen } = await openReschedule();

    await fireEvent.press(button);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveProp(
        "accessibilityState",
        { selected: true },
      );
    });
    expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toHaveStyle({
      backgroundColor: "#F2E4E1",
    });
    expect(screen.getByTestId("reschedule-radio")).toHaveStyle({ backgroundColor: "#B78380" });
    expect(
      screen.getByText(/^Tu lugar de las \d\d:\d\d se libera al confirmar$/),
    ).toBeOnTheScreen();
  });
});
