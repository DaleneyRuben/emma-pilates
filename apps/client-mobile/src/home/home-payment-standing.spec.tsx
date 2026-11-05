import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { baseRoutes, intent, payment } from "../payments/purchase-test-support";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const pendingPayment = { ...payment, amountDueCentavos: 50_200 };
const rejectedPayment = {
  ...payment,
  state: "rejected",
  rejectionReason: "El monto del comprobante no coincide con el plan.",
};

async function openHome(routes: Parameters<typeof routeFetcher>[0]) {
  const fetcher = routeFetcher({ ...baseRoutes(0), ...routes });
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByText("Accesos rápidos")).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  return screen;
}

// Walkthrough n.º 22, follow-up 246 (C02c, C02d): a payment in review or a
// rejected receipt is Inicio's state of its own, never «Comprar un plan».
describe("Client Home with a payment in review or rejected", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the payment in review with its Plan and amount (C02c)", async () => {
    const screen = await openHome({
      "/api/v1/payments/current": () => jsonResponse(pendingPayment),
    });

    expect(screen.getByText("En revisión")).toBeOnTheScreen();
    // The card's title and the locked booking row's note.
    expect(screen.getAllByText("Tu pago está en revisión")).toHaveLength(2);
    expect(screen.getByText("Paquete de 8 clases · Bs 502")).toBeOnTheScreen();
    expect(screen.getByText("Te avisamos apenas el estudio lo confirme.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).toBeNull();
    expect(screen.queryByText("Elige tu plan y empieza a moverte")).toBeNull();
    expect(screen.getByTestId("home-payment-card")).toHaveStyle({ backgroundColor: "#93615D" });
    // The locked booking row says why.
    expect(screen.getByRole("button", { name: "Reservar una clase" })).toBeDisabled();
    expect(screen.queryByText("Necesitas un plan activo")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Ver estado del pago" }));
    await waitFor(() => {
      expect(screen.getByText(/Nuestro equipo está revisando tu comprobante/)).toBeOnTheScreen();
    });
  });

  it("shows the rejected receipt with the reason (C02d)", async () => {
    const screen = await openHome({
      "/api/v1/payments/current": () => jsonResponse(rejectedPayment),
    });

    expect(screen.getByText("Pago rechazado")).toBeOnTheScreen();
    expect(screen.getByText("No pudimos confirmar tu pago")).toBeOnTheScreen();
    expect(screen.getByText("El monto del comprobante no coincide con el plan.")).toBeOnTheScreen();
    expect(screen.getByText("Paquete de 8 clases · Bs 560")).toBeOnTheScreen();
    expect(screen.getByText("Tu pago no se confirmó")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).toBeNull();
  });

  it("starts another payment of the same Plan from the rejected card", async () => {
    const created = jest.fn();
    const screen = await openHome({
      "/api/v1/payments/current": () => jsonResponse(rejectedPayment),
      "POST /api/v1/purchase-intents": (init) => {
        created(JSON.parse(String(init?.body)));
        return jsonResponse(intent, 201);
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Subir otro comprobante" }));

    await waitFor(() => {
      expect(screen.getByText("2 · Sube tu comprobante")).toBeOnTheScreen();
    });
    expect(created).toHaveBeenCalledWith({ planId: payment.planId });
  });

  it("ignores a second tap while the new payment is being prepared", async () => {
    const created = jest.fn();
    let answer: (response: Response) => void = () => undefined;
    const screen = await openHome({
      "/api/v1/payments/current": () => jsonResponse(rejectedPayment),
      // Held open until the second tap has landed.
      "POST /api/v1/purchase-intents": () => {
        created();
        return new Promise<Response>((resolve) => {
          answer = resolve;
        }) as unknown as Response;
      },
    });

    await fireEvent.press(screen.getByRole("button", { name: "Subir otro comprobante" }));
    await fireEvent.press(screen.getByRole("button", { name: "Preparando…" }));
    answer(jsonResponse(intent, 201));

    await waitFor(() => {
      expect(screen.getByText("2 · Sube tu comprobante")).toBeOnTheScreen();
    });
    expect(created).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("2 · Sube tu comprobante")).toHaveLength(1);
  });

  it("resumes the payment she already started instead of failing", async () => {
    const screen = await openHome({
      "/api/v1/payments/current": () => jsonResponse(rejectedPayment),
      "POST /api/v1/purchase-intents": () =>
        jsonResponse({ code: "purchase_intent_open_exists", status: 422 }, 422),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Subir otro comprobante" }));

    await waitFor(() => {
      expect(screen.getByText("2 · Sube tu comprobante")).toBeOnTheScreen();
    });
  });

  it("keeps the active Plan on Inicio while a renewal is in review", async () => {
    const screen = await openHome({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({
          status: "active",
          subscription: {
            id: "subscription-1",
            planName: "Paquete de 8 clases",
            originalClassAllowance: 8,
            remainingClassAllowance: 5,
            startsOn: "2026-09-11",
            endsOn: "2026-10-11",
          },
        }),
      "/api/v1/payments/current": () => jsonResponse(pendingPayment),
    });

    expect(screen.getByTestId("home-plan-card")).toBeOnTheScreen();
    expect(screen.queryByTestId("home-payment-card")).toBeNull();
  });
});
