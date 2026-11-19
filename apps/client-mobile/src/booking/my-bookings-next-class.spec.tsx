import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import {
  ancestorBackgrounds,
  createClientRuntime,
  jsonResponse,
  routeFetcher,
} from "../test-support";

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
const facts = (offset: number) => {
  const startsAt = new Date(Date.now() + offset);
  return {
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000).toISOString(),
  };
};
const waitlisted = {
  kind: "waitlist",
  waitlistEntryId: "entry-1",
  sessionId: "session-wait",
  classTypeName: "Pilates Prenatal",
  trainerName: "Andrea Suárez",
  branchName: "Equipetrol",
  ...facts(20 * hour),
};
const soon = {
  kind: "booking",
  bookingId: "booking-soon",
  sessionId: "session-soon",
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  branchName: "Urubó",
  ...facts(30 * hour),
};
const later = {
  kind: "booking",
  bookingId: "booking-later",
  sessionId: "session-later",
  classTypeName: "Reformer Pilates",
  trainerName: "Emma Vargas",
  branchName: "Centro",
  ...facts(50 * hour),
};

async function openMyBookings(upcoming: unknown[]) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/bookings": () => jsonResponse(upcoming),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => expect(screen.getByRole("button", { name: /Mis reservas, tab/ })).toBeOnTheScreen(),
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Mis reservas, tab/ }));
  await waitFor(() => expect(screen.getByTestId("bookings-next-class")).toBeOnTheScreen());
  return screen;
}

// FIX-089 (ClaseE): the first booked class tops Mis reservas as the Palo de
// rosa hero, its action right under it; the others stay cards. A waitlist
// place is a normal state, said in words rather than a pill.
describe("Client Mis reservas, palette B", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the next booked class on top as the hero, with its action under it", async () => {
    const screen = await openMyBookings([waitlisted, soon, later]);

    const hero = screen.getByTestId("bookings-next-class");
    expect(hero).toHaveStyle({ backgroundColor: "#B78380" });
    expect(within(hero).getByText(/^\d\d:\d\d · Mat Pilates$/)).toHaveStyle({
      color: "#F9F4F2",
    });
    expect(within(hero).getByText("Urubó · Daniela Ortiz")).toBeOnTheScreen();
    expect(within(hero).getByText(/^PRÓXIMA · /)).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Cancelar reserva" })).toHaveLength(2);
    // The hero's class is not repeated as a card below it.
    expect(screen.getAllByText(/Mat Pilates/)).toHaveLength(1);
    expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
  });

  it("says a waitlist place in words, without a pill", async () => {
    const screen = await openMyBookings([waitlisted, soon]);

    const words = screen.getByText("En lista de espera");
    expect(words).toHaveStyle({ color: "#93615D", fontFamily: "WorkSans_600SemiBold" });
    expect(ancestorBackgrounds(words)).not.toContain("#E7CCBF");
  });
});
