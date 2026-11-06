import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { payment } from "../payments/purchase-test-support";
import { jsonResponse } from "../test-support";
import { openDetail } from "./session-detail-test-support";

jest.setTimeout(20_000);

const noPlan = {
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({ status: "none", subscription: null }),
};
const pendingPayment = { ...payment, amountDueCentavos: 50_200 };
const rejectedPayment = {
  ...payment,
  state: "rejected",
  rejectionReason: "El monto del comprobante no coincide con el plan.",
};

// Walkthrough n.º 19 and 22, follow-up 246 (C04c–C04f): the class detail
// names the reason Reservar is off instead of «No te quedan clases».
describe("Client Session detail when Reservar is off", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("asks a Client without a Plan to buy one (C04c)", async () => {
    const { screen } = await openDetail(noPlan);

    expect(screen.getByText("Necesitas un plan para reservar.")).toBeOnTheScreen();
    expect(screen.queryByText("No te quedan clases en tu plan.")).toBeNull();
    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));
    await waitFor(() => {
      expect(screen.getByText("Elige tu plan")).toBeOnTheScreen();
    });
  });

  it("keeps «No te quedan clases» for a Plan with no classes left (C04d)", async () => {
    const { screen } = await openDetail({}, 0);

    expect(screen.getByText("No te quedan clases en tu plan.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
  });

  it("says the payment is in review and opens Estado del pago (C04e)", async () => {
    const { screen } = await openDetail({
      ...noPlan,
      "/api/v1/payments/current": () => jsonResponse(pendingPayment),
    });

    expect(
      screen.getByText("Tu pago está en revisión. Podrás reservar cuando el estudio lo confirme."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reservar" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Ver estado del pago" }));
    await waitFor(() => {
      expect(screen.getByText("Tu pago está en revisión")).toBeOnTheScreen();
    });
  });

  it("puts the payment in review before a Plan with no classes left", async () => {
    const { screen } = await openDetail(
      { "/api/v1/payments/current": () => jsonResponse(pendingPayment) },
      0,
    );

    expect(
      screen.getByText("Tu pago está en revisión. Podrás reservar cuando el estudio lo confirme."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("No te quedan clases en tu plan.")).toBeNull();
  });

  it("still books with classes left while a renewal is in review", async () => {
    const { screen } = await openDetail({
      "/api/v1/payments/current": () => jsonResponse(pendingPayment),
    });

    expect(screen.getByRole("button", { name: "Reservar" })).toBeEnabled();
    expect(screen.getByText("Se descuenta 1 clase de tu plan")).toBeOnTheScreen();
  });

  it("offers another receipt for the same Plan after a rejection (C04f)", async () => {
    const created = jest.fn();
    const { screen } = await openDetail({
      ...noPlan,
      "/api/v1/payments/current": () => jsonResponse(rejectedPayment),
      "POST /api/v1/purchase-intents": (init) => {
        created(JSON.parse(String(init?.body)));
        return jsonResponse({ code: "not_found", status: 404 }, 404);
      },
    });

    expect(screen.getByText("No pudimos confirmar tu pago.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Comprar un plan" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Subir otro comprobante" }));
    await waitFor(() => {
      expect(created).toHaveBeenCalledWith({ planId: payment.planId });
    });
  });
});
