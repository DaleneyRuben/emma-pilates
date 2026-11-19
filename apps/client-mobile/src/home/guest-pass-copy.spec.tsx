import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { openDetail } from "../booking/session-detail-test-support";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

// The Guest Pass as the API serves it: a hidden one-class Plan whose class is
// a courtesy extra, so its own allowance reads 0 (open-guest-pass.ts).
const guestPass = (usedClassStartsAt: string | null) => ({
  status: "active",
  subscription: {
    id: "subscription-guest",
    planName: "Pase de invitada",
    originalClassAllowance: 1,
    remainingClassAllowance: 0,
    startsOn: "2026-11-07",
    endsOn: "2026-12-07",
    extraClassesLine: usedClassStartsAt === null ? "Clases extra: 1 · Cortesía" : null,
    guestPass: { usedClassStartsAt },
  },
});
// Lun lun 16 nov, 16:00 in La Paz.
const usedOn = "2026-11-16T20:00:00.000Z";

async function openHome(view: ReturnType<typeof guestPass>) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () =>
      jsonResponse({
        id: "client-1",
        name: "Elena Rojas",
        email: "elena@example.com",
        phone: null,
        referralCode: "REF-ELENA",
      }),
    "/api/v1/clients/current/subscription": () => jsonResponse(view),
    "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByTestId("home-guest-pass-card")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  return screen;
}

// Walkthrough n.º 56 and 57: the Guest Pass reads as one free class, never as
// a Plan with 0 classes left.
describe("Guest Pass copy", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("offers the unused free class on Inicio and in Mi plan", async () => {
    const screen = await openHome(guestPass(null));

    const card = within(screen.getByTestId("home-guest-pass-card"));
    expect(card.getByText("Tu clase gratis de invitada")).toBeOnTheScreen();
    expect(card.getByText("Úsala antes del lun 7 dic")).toBeOnTheScreen();
    expect(screen.queryByText(/clases? restantes?/)).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();

    await fireEvent.press(card.getByRole("button", { name: "Mi plan" }));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());

    const hero = within(screen.getByTestId("subscription-guest-pass"));
    expect(hero.getByText("Tu clase gratis de invitada")).toBeOnTheScreen();
    expect(hero.getByText("Úsala antes del lun 7 dic")).toBeOnTheScreen();
    expect(screen.queryByText(/clases restantes/)).toBeNull();
    expect(screen.queryByText("Clases extra: 1 · Cortesía")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Renovar mi plan/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });

  it("says when the class was used and offers a plan", async () => {
    const screen = await openHome(guestPass(usedOn));

    const card = within(screen.getByTestId("home-guest-pass-card"));
    expect(card.getByText("Clase de invitada usada")).toBeOnTheScreen();
    expect(card.getByText("Lun 16, 16:00")).toBeOnTheScreen();
    expect(card.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    expect(screen.queryByText(/clases? restantes?/)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: /^Perfil, tab/ }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Mi plan/ }));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());

    const hero = within(screen.getByTestId("subscription-guest-pass"));
    expect(hero.getByText("Clase de invitada usada")).toBeOnTheScreen();
    expect(hero.getByText("Lun 16, 16:00")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });

  it("calls the class the free guest class on its detail", async () => {
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () => jsonResponse(guestPass(null)),
    });

    expect(screen.getByText("Es tu clase gratis de invitada")).toBeOnTheScreen();
    expect(screen.queryByText("Se descuenta 1 clase de tu plan")).toBeNull();
    expect(screen.getByRole("button", { name: "Reservar" })).toBeEnabled();
  });

  it("asks for a plan on a class detail once the pass is used", async () => {
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () => jsonResponse(guestPass(usedOn)),
    });

    expect(screen.getByText("No te quedan clases en tu plan.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });
});
