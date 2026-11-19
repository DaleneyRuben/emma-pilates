import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

const profile = {
  id: "client-1",
  name: "Valeria Quiroga",
  email: "valeria@example.com",
  phone: null,
  referralCode: "REF-VALERIA",
};

const subscription = (
  status: string,
  remaining: number,
  extraClassesLine: string | null = null,
) => ({
  status,
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 12 clases",
    originalClassAllowance: 12,
    remainingClassAllowance: remaining,
    startsOn: "2026-08-25",
    endsOn: "2026-09-24",
    extraClassesLine,
  },
});

async function openSubscription(view: unknown) {
  const fetcher = routeFetcher({
    "/api/v1/clients/current": () => jsonResponse(profile),
    "/api/v1/clients/current/subscription": () => jsonResponse(view),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^Mi plan/ })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: /^Mi plan/ }));
  await waitFor(() => {
    expect(screen.getByRole("header", { name: "Mi plan" })).toBeOnTheScreen();
  });

  return screen;
}

describe("Client Subscription detail", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the active Plan with allowance and dates", async () => {
    const screen = await openSubscription(subscription("active", 5));

    // C12: the plan card, then «Detalles» as rows. FIX-082 (Mi plan option A):
    // a light Lino card with the name and a status dot.
    expect(screen.getByTestId("subscription-hero")).toHaveStyle({ backgroundColor: "#F9F4F2" });
    expect(screen.getByText("Paquete de 12 clases")).toBeOnTheScreen();
    expect(screen.getByText("Activo")).toBeOnTheScreen();
    expect(screen.getByText("5")).toBeOnTheScreen();
    expect(screen.getByText("de 12 clases restantes")).toBeOnTheScreen();
    expect(screen.getByText("Empezó")).toBeOnTheScreen();
    expect(screen.getByText("25 de agosto")).toBeOnTheScreen();
    // Follow-up 177: the end is an expiry, «Vence», not «Pagado hasta».
    expect(screen.getByText("Vence")).toBeOnTheScreen();
    expect(screen.getByText("24 de septiembre")).toBeOnTheScreen();
    expect(screen.getByText("Vence el 24 de septiembre")).toBeOnTheScreen();
    // Finding 54 (follow-up 259 A): Reservar lives on the tab bar, not here.
    expect(screen.queryByRole("button", { name: "Reservar una clase" })).toBeNull();
    expect(screen.queryByText("Clases extra: 1 · Regalo de bienvenida")).toBeNull();
    expect(screen.queryByText("Pagado hasta")).toBeNull();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).not.toBeOnTheScreen();
  });

  // FIX-082: the origin joins the card's line instead of a loose line.
  it("shows the gift class with its origin", async () => {
    const screen = await openSubscription({
      ...subscription("active", 5, "Clases extra: 1 · Regalo de bienvenida"),
      subscription: {
        ...subscription("active", 5).subscription,
        extraClasses: 1,
        extraClassesLine: "Clases extra: 1 · Regalo de bienvenida",
      },
    });

    expect(
      screen.getByText(
        "5 del plan + 1 de regalo (regalo de bienvenida) · vence el 24 de septiembre",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Clases extra: 1 · Regalo de bienvenida")).toBeNull();
  });

  it("warns about the paid-through date when expiring soon", async () => {
    const screen = await openSubscription(subscription("expiring_soon", 2));

    expect(screen.getByText("Por vencer")).toBeOnTheScreen();
    // FIX-082: the end is said once, on the card and in the details.
    expect(screen.getByText("Vence el 24 de septiembre")).toBeOnTheScreen();
    expect(screen.queryByText("Tu plan vence el 24 de septiembre.")).toBeNull();
  });

  it("tells the Client when no classes remain", async () => {
    const screen = await openSubscription(subscription("active", 0));

    expect(screen.getByText("0")).toBeOnTheScreen();
    expect(screen.getByText("de 12 clases restantes")).toBeOnTheScreen();
  });
});

describe("Refreshed Mi plan (Client 12)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // The owner flagged «Podrás comprar otro plan cuando este termine» as wrong:
  // Mi plan offers an early renewal (follow-up 227); FIX-082 (Mi plan option
  // A) makes it the solid button under the card with one line under it.
  it("offers an early renewal that starts the day after this Plan ends", async () => {
    const screen = await openSubscription(subscription("active", 5));

    expect(
      screen.getByText(
        "Eliges cuándo empieza el nuevo: entre el 25 de septiembre y el 22 de octubre.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Renovar mi plan" }));
    await waitFor(() => {
      expect(screen.getByRole("header", { name: "Elige tu plan" })).toBeOnTheScreen();
    });
  });

  it("names the next Plan when a future Subscription exists", async () => {
    const screen = await openSubscription({
      ...subscription("active", 5),
      nextSubscription: {
        id: "subscription-2",
        planName: "Paquete de 8 clases",
        originalClassAllowance: 8,
        remainingClassAllowance: 8,
        startsOn: "2026-09-25",
        endsOn: "2026-10-24",
      },
    });

    expect(screen.getByText("Siguiente plan")).toBeOnTheScreen();
    expect(screen.getByText("25 de septiembre")).toBeOnTheScreen();
  });

  // Walkthrough finding 98: she already renewed, so the discount is kept.
  it("drops the founder renewal deadline once the next Plan is paid", async () => {
    const screen = await openSubscription({
      ...subscription("active", 5),
      founderRenewalDeadline: "2026-10-01",
      nextSubscription: {
        id: "subscription-2",
        planName: "Paquete de 8 clases",
        originalClassAllowance: 8,
        remainingClassAllowance: 8,
        startsOn: "2026-09-25",
        endsOn: "2026-10-24",
      },
    });

    expect(screen.queryByText(/Renueva antes del/)).toBeNull();
    expect(screen.getByText("Tu plan siguiente empieza el 25 de septiembre.")).toBeOnTheScreen();
  });

  it("names the founder renewal deadline from the current Subscription", async () => {
    const screen = await openSubscription({
      ...subscription("active", 5),
      founderRenewalDeadline: "2026-10-01",
    });

    // Walkthrough finding 49: the deadline says why, without «fundadora».
    expect(
      screen.getByText("Renueva antes del 1 de octubre y mantienes tu 15 % de descuento."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/fundadora/i)).toBeNull();
  });

  it("invites renewal while expiring soon", async () => {
    const screen = await openSubscription(subscription("expiring_soon", 2));

    expect(screen.getByRole("button", { name: "Renovar mi plan" })).toBeOnTheScreen();
    expect(screen.getByText(/^Eliges cuándo empieza el nuevo/)).toBeOnTheScreen();
  });

  it("shows the last Plan as expired with its end date and the only purchase action", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse(subscription("expired", 3)),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Perfil, .*tab/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Perfil, .*tab/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Mi plan/ })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: /^Mi plan/ }));
    await waitFor(() => {
      expect(screen.getByText("Último plan · Paquete de 12 clases")).toBeOnTheScreen();
    });

    expect(screen.getByText("Vencido")).toBeOnTheScreen();
    expect(screen.getByText("Venció el 24 de septiembre")).toBeOnTheScreen();
    expect(screen.getByText("clases disponibles")).toBeOnTheScreen();
    expect(screen.getByText("Elige tu próximo plan")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Renovar mi plan" })).toBeNull();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });
});
