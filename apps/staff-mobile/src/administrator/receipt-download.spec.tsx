import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hour = 60 * 60_000;
const yesterdayAt1940 = `${boliviaCivilDate(new Date(Date.now() - 24 * hour))}T23:40:00.000Z`;

const carla = {
  id: "payment-1",
  clientName: "Carla Mendoza",
  planName: "Paquete de 8 clases",
  amountDueCentavos: 56_000,
  submittedAt: yesterdayAt1940,
  receiptAvailable: true,
};

const review = {
  id: carla.id,
  method: "transfer",
  state: "pending",
  planId: "plan-1",
  planName: carla.planName,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: carla.amountDueCentavos,
  creditAppliedCentavos: 0,
  amountDueCentavos: carla.amountDueCentavos,
  submittedAt: carla.submittedAt,
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
  clientName: carla.clientName,
  receipt: { imageAssetId: "asset-1", mediaType: "image/png" },
  receiptUrl: "/api/v1/administrator/payments/payment-1/receipt",
};

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

describe("A failed receipt download", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows an error and refuses to confirm until the receipt is on screen", async () => {
    let receiptStatus = 500;
    const confirmed = jest.fn();
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () =>
              jsonResponse({
                id: "staff-2",
                name: "Paola Mendoza",
                email: "paola.mendoza@example.com",
                phone: null,
                role: "administrator",
                branches: [],
              }),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/administrator/payments/pending": () => jsonResponse([carla]),
            "/api/v1/administrator/payments/payment-1": () => jsonResponse(review),
            "/api/v1/administrator/payments/payment-1/receipt": () =>
              receiptStatus === 200
                ? new Response(pngBytes, {
                    headers: { "Content-Type": "image/png" },
                    status: 200,
                  })
                : new Response(null, { status: receiptStatus }),
            "POST /api/v1/administrator/payments/payment-1/confirm": () => {
              confirmed();
              return jsonResponse({ ...review, state: "confirmed" }, 201);
            },
          }),
          "administrator",
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Revisar pago de Carla Mendoza" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Revisar pago de Carla Mendoza" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No pudimos mostrar el comprobante.");
    });
    expect(screen.queryByText("Cargando el comprobante…")).toBeNull();
    expect(screen.getByRole("button", { name: "Confirmar pago" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeEnabled();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago" }));
    expect(confirmed).not.toHaveBeenCalled();

    receiptStatus = 200;
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Comprobante de transferencia")).toBeOnTheScreen();
    });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Confirmar pago" })).toBeEnabled();
  });
});
