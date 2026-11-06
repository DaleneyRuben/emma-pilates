import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { baseRoutes, payment } from "../payments/purchase-test-support";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

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

async function renewFromMyPlan(current: unknown) {
  const fetcher = routeFetcher({
    ...baseRoutes(0),
    "/api/v1/clients/current/subscription": () => jsonResponse(active),
    "/api/v1/payments/current": () => jsonResponse(current),
  });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Mi plan" })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: "Mi plan" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Renovar mi plan" })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Renovar mi plan" }));
  return screen;
}

// Follow-up 246 §5: while a payment is in review or rejected, Elegir plan
// opens that payment instead of starting a purchase the server refuses.
describe("Client Plans with a payment in review or rejected", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("opens Estado del pago instead of the Plans while one is in review", async () => {
    const screen = await renewFromMyPlan(payment);

    await waitFor(() => {
      expect(screen.getByText(/Nuestro equipo está revisando tu comprobante/)).toBeOnTheScreen();
    });
    expect(screen.queryByText("Elige tu plan")).toBeNull();
  });

  it("opens the rejected payment, never another Plan", async () => {
    const screen = await renewFromMyPlan({
      ...payment,
      state: "rejected",
      rejectionReason: "El monto del comprobante no coincide con el plan.",
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Subir otro comprobante" })).toBeOnTheScreen();
    });
    expect(screen.queryByText("Elige tu plan")).toBeNull();
  });

  it("lists the Plans when the last payment was confirmed", async () => {
    const screen = await renewFromMyPlan({ ...payment, state: "confirmed" });

    await waitFor(() => {
      expect(screen.getByText("Elige tu plan")).toBeOnTheScreen();
    });
  });

  // Review of FIX-043: «Volver al inicio» must not leave Perfil's stack on
  // the payment, where the tab bar is hidden.
  it("leaves Perfil on its own screen after the redirect", async () => {
    const fetcher = routeFetcher({
      ...baseRoutes(0),
      "/api/v1/clients/current/subscription": () => jsonResponse(active),
      "/api/v1/payments/current": () => jsonResponse(payment),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
    await waitFor(
      () => expect(screen.getByRole("button", { name: /Perfil, tab/ })).toBeOnTheScreen(),
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByRole("button", { name: /Perfil, tab/ }));
    await waitFor(() => expect(screen.getByText("Tu plan y tus clases")).toBeOnTheScreen());
    const myPlan = screen.getAllByRole("button", { name: /^Mi plan/ });
    await fireEvent.press(myPlan[myPlan.length - 1]!);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Renovar mi plan" })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Renovar mi plan" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Volver al inicio" })).toBeOnTheScreen(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Volver al inicio" }));
    await waitFor(() => expect(screen.getByTestId("home-plan-card")).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole("button", { name: /Perfil, tab/ }));

    await waitFor(() => expect(screen.getByText("Tu plan y tus clases")).toBeOnTheScreen());
    expect(screen.queryByRole("button", { name: "Volver al inicio" })).toBeNull();
  });

  // Review of FIX-043: a rejected Plan that is no longer sold must not lock
  // her out of every Plan.
  it("lists the Plans when the rejected Plan can no longer be bought", async () => {
    const fetcher = routeFetcher({
      ...baseRoutes(0),
      "/api/v1/payments/current": () =>
        jsonResponse({ ...payment, state: "rejected", rejectionReason: "Monto distinto." }),
      "POST /api/v1/purchase-intents": () =>
        jsonResponse({ code: "plan_not_purchasable", status: 422 }, 422),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: "Subir otro comprobante" })).toBeOnTheScreen(),
      { timeout: 10_000 },
    );

    await fireEvent.press(screen.getByRole("button", { name: "Subir otro comprobante" }));

    await waitFor(() => expect(screen.getByText("Elige tu plan")).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: /^Paquete de 8 clases,/ })).toBeOnTheScreen();
  });
});
