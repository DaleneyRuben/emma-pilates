import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { openDetail } from "../booking/session-detail-test-support";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const spentGuestPass = {
  id: "subscription-guest",
  planName: "Pase de invitada",
  originalClassAllowance: 1,
  remainingClassAllowance: 0,
  startsOn: "2026-11-07",
  endsOn: "2026-11-16",
  extraClassesLine: null,
  extraClasses: 0,
  guestPass: { usedClassStartsAt: "2026-11-16T20:00:00.000Z" },
};
const twelveClasses = {
  id: "subscription-12",
  planName: "12 clases",
  originalClassAllowance: 12,
  remainingClassAllowance: 12,
  startsOn: "2026-11-17",
  endsOn: "2026-12-16",
};

async function openHome(view: unknown, card: string) {
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
  await waitFor(() => expect(screen.getByTestId(card)).toBeOnTheScreen(), { timeout: 10_000 });
  return screen;
}

describe("Inicio and Mi plan plan cards", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // Walkthrough n.º 60: once the guest class is spent, the Plan she bought
  // takes the card, and nothing offers to buy another.
  it("shows the Plan bought after a spent Guest Pass", async () => {
    const screen = await openHome(
      {
        status: "expiring_soon",
        subscription: spentGuestPass,
        nextSubscription: twelveClasses,
        queuedPlanStartsOn: "2026-11-17",
      },
      "home-guest-pass-card",
    );

    const card = within(screen.getByTestId("home-guest-pass-card"));
    expect(card.getByText("Tu plan · 12 clases")).toBeOnTheScreen();
    expect(card.getByText("Empieza el mar 17 nov")).toBeOnTheScreen();
    expect(screen.queryByText("Clase de invitada usada")).toBeNull();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).toBeNull();

    await fireEvent.press(card.getByRole("button", { name: "Mi plan" }));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());

    expect(screen.getByText("Tu plan siguiente empieza el mar 17 nov.")).toBeOnTheScreen();
    expect(screen.queryByText("Tu plan vence el lun 16 nov.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).toBeNull();
  });

  // Walkthrough n.º 61: live extra classes count with the Plan's own.
  it("counts extra classes on Inicio and in Mi plan", async () => {
    const screen = await openHome(
      {
        status: "active",
        subscription: {
          ...twelveClasses,
          startsOn: "2026-11-01",
          endsOn: "2026-11-30",
          extraClassesLine: "Clases extra: 1 · Invitación",
          extraClasses: 1,
        },
      },
      "home-plan-card",
    );

    const card = within(screen.getByTestId("home-plan-card"));
    expect(card.getByText("12 clases")).toBeOnTheScreen();
    expect(card.getByText("13")).toBeOnTheScreen();
    expect(card.getByText("restantes")).toBeOnTheScreen();
    expect(card.getByText("12 del plan + 1 de regalo · vence el lun 30 nov")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: /^Mi plan, 12 clases/ }));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());

    const hero = within(screen.getByTestId("subscription-hero"));
    expect(hero.getByText("13")).toBeOnTheScreen();
    // FIX-082 (Mi plan option A): the origin joins the card's one line.
    expect(
      hero.getByText("12 del plan + 1 de regalo (invitación) · vence el lun 30 nov"),
    ).toBeOnTheScreen();
  });

  it("names no deadline for a Guest Pass that expired unused", async () => {
    const screen = await openHome(
      {
        status: "expired",
        subscription: { ...spentGuestPass, guestPass: { usedClassStartsAt: null } },
      },
      "home-purchase-card",
    );

    await fireEvent.press(screen.getByRole("button", { name: /^Perfil, tab/ }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Plan actual/ }));
    await waitFor(() => expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen());

    expect(screen.queryByText(/^Úsala antes del/)).toBeNull();
    expect(screen.queryByText("Tu clase gratis de invitada")).toBeNull();
  });

  it("never offers Reservar on a spent Guest Pass", async () => {
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({
          status: "active",
          subscription: { ...spentGuestPass, extraClassesLine: "Clases extra: 1 · Cortesía" },
        }),
    });

    expect(screen.getByText("No te quedan clases en tu plan.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeDisabled();
  });

  // Independent review: the Plan she bought covers a class on or after its
  // start, so the class detail books against it.
  it("books a class the Plan bought after a spent Guest Pass covers", async () => {
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({
          status: "active",
          subscription: spentGuestPass,
          nextSubscription: { ...twelveClasses, startsOn: boliviaCivilDate(new Date()) },
        }),
    });

    expect(screen.getByText("Usarás 1 de tus 12 clases.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar esta clase" })).toBeEnabled();
  });
});
