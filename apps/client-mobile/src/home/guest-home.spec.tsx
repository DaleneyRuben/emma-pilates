import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const unusedPass = {
  status: "active",
  subscription: {
    id: "subscription-guest",
    planName: "Pase de invitada",
    originalClassAllowance: 1,
    remainingClassAllowance: 0,
    startsOn: "2026-11-07",
    endsOn: "2026-12-07",
    extraClassesLine: "Clases extra: 1 · Cortesía",
    guestPass: { usedClassStartsAt: null, hostFirstName: "Lucía", hostInitials: "LF" },
  },
};

async function openHome(view: unknown) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({
        id: "client-1",
        name: "Carla Prueba",
        email: "carla@example.com",
        phone: null,
        referralCode: "REF-CARLA",
      }),
    "/api/v1/clients/current/subscription": () => jsonResponse(view),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  return render(<App runtime={createClientRuntime(fetcher)} />);
}

// Walkthrough n.º 19 and 22 (C02f, C02j).
describe("the guest's Inicio", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says who invited her and books the free class from the card", async () => {
    const screen = await openHome(unusedPass);
    const card = within(await screen.findByTestId("home-guest-pass-card", {}, { timeout: 10_000 }));

    expect(card.getByText("Te invitó Lucía")).toBeOnTheScreen();
    expect(card.getByText("LF")).toBeOnTheScreen();
    expect(card.getByText("Tu clase gratis de invitada")).toBeOnTheScreen();
    expect(card.queryByRole("button", { name: "Mi plan" })).toBeNull();

    await fireEvent.press(card.getByRole("button", { name: "Reservar mi clase gratis" }));
    await waitFor(() => expect(screen.getByRole("header", { name: "Reservar" })).toBeOnTheScreen());
  });

  it("says her friend's code was not active when she got no free class", async () => {
    const screen = await openHome({
      status: "none",
      subscription: null,
      nextSubscription: null,
      founderRenewalDeadline: null,
      freeze: null,
      canRequestFreeze: false,
      inactiveInvite: { hostFirstName: "Lucía" },
    });
    const notice = within(
      await screen.findByTestId("home-inactive-invite", {}, { timeout: 10_000 }),
    );

    expect(notice.getByText("El código de Lucía todavía no está activo")).toBeOnTheScreen();
    expect(notice.getByText("Esta vez tu cuenta no incluye la clase gratis.")).toBeOnTheScreen();
    expect(screen.getByTestId("home-purchase-card")).toBeOnTheScreen();
  });
});
