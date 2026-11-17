import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const minute = 60_000;

// Monday 16 November 2026, 09:00 in La Paz.
const evaluationStartsAt = "2026-11-16T13:00:00.000Z";

const lucia = {
  id: "payment-1",
  clientName: "Lucia Fernandez",
  planName: "Evaluación nutricional",
  kind: "evaluation",
  evaluationStartsAt,
  amountDueCentavos: 7_000,
  submittedAt: new Date(Date.now() - 3 * minute).toISOString(),
  receiptAvailable: true,
};

const reviewOf = (extra: Record<string, unknown>) => ({
  id: lucia.id,
  method: "transfer",
  state: "pending",
  planId: "plan-12",
  planName: lucia.planName,
  durationDays: 30,
  durationMonths: 1,
  classAllowance: 12,
  planPriceCentavos: lucia.amountDueCentavos,
  creditAppliedCentavos: 0,
  amountDueCentavos: lucia.amountDueCentavos,
  startsOn: "2026-11-01",
  submittedAt: lucia.submittedAt,
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
  clientName: lucia.clientName,
  clientPhoto: null,
  invoiceData: null,
  receipt: { imageAssetId: "asset-1", mediaType: "image/png" },
  receiptUrl: `/api/v1/administrator/payments/${lucia.id}/receipt`,
  ...extra,
});

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

async function openPayments(pending: Record<string, unknown>, review: ReturnType<typeof reviewOf>) {
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
          "/api/v1/administrator/payments/pending": () => jsonResponse([pending]),
          "/api/v1/administrator/payments/payment-1": () => jsonResponse(review),
          "/api/v1/administrator/payments/payment-1/receipt": () =>
            new Response(pngBytes, { headers: { "Content-Type": "image/png" }, status: 200 }),
        }),
        "administrator",
      )}
    />,
  );
  await waitFor(() => expect(screen.getByText("Lucia Fernandez")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  return screen;
}

async function review(screen: Awaited<ReturnType<typeof openPayments>>) {
  await fireEvent.press(screen.getByRole("button", { name: "Revisar pago de Lucia Fernandez" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Comprobante de transferencia")).toBeOnTheScreen(),
  );
}

// Walkthrough n.º 65: an Evaluation transfer names the Evaluation and when
// it is, not the Plan she holds.
describe("Pagos pendientes names an Evaluation sale", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("names the Evaluation and its time in the queue and in Revisar pago", async () => {
    const screen = await openPayments(lucia, reviewOf({ kind: "evaluation", evaluationStartsAt }));

    expect(
      screen.getByText("Evaluación nutricional · lun 16, 09:00 · hace 3 minutos"),
    ).toBeOnTheScreen();

    await review(screen);
    expect(
      screen.getByText("Lucia Fernandez · Evaluación nutricional · lun 16, 09:00"),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Rechazar" }));
    expect(screen.getByText("Evaluación nutricional · lun 16, 09:00")).toBeOnTheScreen();
  });
});

// Walkthrough n.º 73: a discounted Plan shows the breakdown she saw paying.
describe("Revisar pago breaks down a discounted Plan", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  const plan = {
    ...lucia,
    planName: "Paquete de 12 clases",
    kind: "plan",
    evaluationStartsAt: undefined,
    amountDueCentavos: 69_700,
  };

  it("shows the Plan price, the discount, and the total", async () => {
    const screen = await openPayments(
      plan,
      reviewOf({
        kind: "plan",
        planName: plan.planName,
        planPriceCentavos: 82_000,
        discountCentavos: 12_300,
        amountDueCentavos: 69_700,
      }),
    );
    await review(screen);

    expect(screen.getByText("Desglose")).toBeOnTheScreen();
    expect(screen.getByText("Precio del plan")).toBeOnTheScreen();
    expect(screen.getByText("Bs 820")).toBeOnTheScreen();
    expect(screen.getByText("Descuento 15 %")).toBeOnTheScreen();
    expect(screen.getByText("−Bs 123")).toBeOnTheScreen();
    expect(screen.getByText("Total")).toBeOnTheScreen();
  });

  it("adds no breakdown without a discount", async () => {
    const screen = await openPayments(
      plan,
      reviewOf({ kind: "plan", planName: plan.planName, discountCentavos: 0 }),
    );
    await review(screen);

    expect(screen.queryByText("Desglose")).toBeNull();
  });
});
