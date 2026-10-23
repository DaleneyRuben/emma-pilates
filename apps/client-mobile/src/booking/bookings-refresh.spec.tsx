import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

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
const booking = (bookingId: string, classTypeName: string, offsetHours: number) => {
  const startsAt = new Date(Date.now() + offsetHours * hour);
  return {
    kind: "booking",
    bookingId,
    sessionId: `session-${bookingId}`,
    classTypeName,
    trainerName: "Emma Vargas",
    branchName: "Centro",
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000).toISOString(),
  };
};

const reformer = booking("booking-1", "Reformer Pilates", 26);
const frontDesk = booking("booking-2", "Mat Pilates", 50);

async function openMyBookings(upcoming: () => unknown[]) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/bookings": () => jsonResponse(upcoming()),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

  await waitFor(
    () => expect(screen.getByRole("button", { name: /Mis Reservas, tab/ })).toBeOnTheScreen(),
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));
  await waitFor(() => expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen(), {
    timeout: 5_000,
  });
  return screen;
}

// UX-001 finding C1: the tab stays mounted, so `refetchOnMount` alone left a
// booking made at the front desk invisible until the app restarted.
describe("Mis reservas refresh (UX-004)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows a booking made elsewhere when the tab regains focus, without a loading state", async () => {
    let upcoming = [reformer];
    const screen = await openMyBookings(() => upcoming);

    await fireEvent.press(screen.getByRole("button", { name: /Inicio, tab/ }));
    await waitFor(() => expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen());
    upcoming = [reformer, frontDesk];

    await fireEvent.press(screen.getByRole("button", { name: /Mis Reservas, tab/ }));

    expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Cargando reservas")).not.toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText("Mat Pilates")).toBeOnTheScreen());
    expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen();
  });

  it("refetches the list on a pull", async () => {
    let upcoming = [reformer];
    const screen = await openMyBookings(() => upcoming);
    upcoming = [reformer, frontDesk];

    const [control] = screen.getByTestId("bookings-scroll").children;
    if (typeof control === "string") throw new Error("The control is the first child");
    await fireEvent(control, "refresh");

    await waitFor(() => expect(screen.getByText("Mat Pilates")).toBeOnTheScreen());
  });
});
