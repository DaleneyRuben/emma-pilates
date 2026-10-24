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
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Ver detalle" }));
  await waitFor(() => {
    expect(screen.getByText("Mi plan")).toBeOnTheScreen();
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

    expect(screen.getByText("Paquete de 12 clases")).toBeOnTheScreen();
    expect(screen.getByText("Activa")).toBeOnTheScreen();
    expect(screen.getByText("5 de 12 clases")).toBeOnTheScreen();
    expect(screen.getByText("Te quedan 5 clases por usar")).toBeOnTheScreen();
    expect(screen.getByText("25 de agosto de 2026")).toBeOnTheScreen();
    expect(screen.getByText("24 de septiembre de 2026")).toBeOnTheScreen();
    // Follow-up 177: the end is an expiry, «Vence el», not «Pagado hasta».
    expect(screen.getByText("Vence el")).toBeOnTheScreen();
    expect(screen.queryByText("Clases extra: 1 · Regalo de bienvenida")).toBeNull();
    expect(screen.queryByText("Pagado hasta")).toBeNull();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).not.toBeOnTheScreen();
  });

  it("shows the gift class with its origin", async () => {
    const screen = await openSubscription(
      subscription("active", 5, "Clases extra: 1 · Regalo de bienvenida"),
    );

    expect(screen.getByText("Clases extra: 1 · Regalo de bienvenida")).toBeOnTheScreen();
  });

  it("warns about the paid-through date when expiring soon", async () => {
    const screen = await openSubscription(subscription("expiring_soon", 2));

    expect(screen.getByText("Por vencer")).toBeOnTheScreen();
    expect(screen.getByText("Tu plan vence el 24 de septiembre.")).toBeOnTheScreen();
  });

  it("tells the Client when no classes remain", async () => {
    const screen = await openSubscription(subscription("active", 0));

    expect(screen.getByText("Sin clases disponibles")).toBeOnTheScreen();
  });
});

describe("Refreshed Mi plan (Client 12)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("labels the current Subscription and says a new Plan waits for it to end", async () => {
    const screen = await openSubscription(subscription("active", 5));

    expect(screen.getByText("Suscripción actual")).toBeOnTheScreen();
    expect(screen.getByText("25 de agosto de 2026")).toBeOnTheScreen();
    expect(screen.getByText("24 de septiembre de 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Renovar plan" })).toBeOnTheScreen();
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

    const nextPlan = screen.getByText("Siguiente plan desde 25 de septiembre de 2026");
    expect(nextPlan).toBeOnTheScreen();
    // A long date must shrink inside the row, or it runs into the label on a phone.
    expect(nextPlan).toHaveStyle({ flexShrink: 1 });
  });

  it("names the founder renewal deadline from the current Subscription", async () => {
    const screen = await openSubscription({
      ...subscription("active", 5),
      founderRenewalDeadline: "2026-10-01",
    });

    expect(screen.getByText("Renueva antes del 1 de octubre de 2026.")).toBeOnTheScreen();
  });

  it("invites renewal while expiring soon", async () => {
    const screen = await openSubscription(subscription("expiring_soon", 2));

    expect(
      screen.getByText("Renueva cuando quieras y elige tu fecha de inicio."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Renovar plan" })).toBeOnTheScreen();
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
      expect(screen.getByText("Último plan")).toBeOnTheScreen();
    });

    expect(screen.getByText("Venció el")).toBeOnTheScreen();
    expect(screen.getByText("Sin clases disponibles")).toBeOnTheScreen();
    expect(screen.getByText("Elige el paquete que mejor te acomode.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });
});
