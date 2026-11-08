import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { formatCivilDayMonth } from "../assistant/assistant-format";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const day = 24 * 60 * 60_000;
const civilIn = (days: number) => boliviaCivilDate(new Date(Date.now() + days * day));

const rocio = {
  id: "payment-1",
  clientName: "Rocío Vaca",
  planName: "Paquete de 4 clases",
  amountDueCentavos: 24_700,
  submittedAt: new Date(Date.now() - day).toISOString(),
  receiptAvailable: true,
};

const reviewOf = (extra: {
  startsOn: string;
  nextPlan?: boolean;
  state?: string;
  kind?: string;
  planName?: string;
}) => ({
  id: rocio.id,
  method: "transfer",
  state: "pending",
  planId: "plan-4",
  planName: rocio.planName,
  durationDays: 30,
  durationMonths: 1,
  classAllowance: 4,
  planPriceCentavos: rocio.amountDueCentavos,
  creditAppliedCentavos: 0,
  amountDueCentavos: rocio.amountDueCentavos,
  submittedAt: rocio.submittedAt,
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
  clientName: rocio.clientName,
  receipt: { imageAssetId: "asset-1", mediaType: "image/png" },
  receiptUrl: `/api/v1/administrator/payments/${rocio.id}/receipt`,
  ...extra,
});

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

async function reviewAndConfirm(review: ReturnType<typeof reviewOf>) {
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
          "/api/v1/administrator/payments/pending": () => jsonResponse([rocio]),
          "/api/v1/administrator/payments/payment-1": () => jsonResponse(review),
          "/api/v1/administrator/payments/payment-1/receipt": () =>
            new Response(pngBytes, { headers: { "Content-Type": "image/png" }, status: 200 }),
          "POST /api/v1/administrator/payments/payment-1/confirm": () =>
            jsonResponse({ ...review, state: "confirmed" }, 201),
        }),
        "administrator",
      )}
    />,
  );
  await waitFor(() => expect(screen.getByText("Rocío Vaca")).toBeOnTheScreen(), {
    timeout: 10_000,
  });
  await fireEvent.press(screen.getByRole("button", { name: "Revisar pago de Rocío Vaca" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Comprobante de transferencia")).toBeOnTheScreen(),
  );
  return screen;
}

// FIX-052 (walkthrough n.º 47): Ana confirms a Plan that starts weeks later,
// so S12 and its notice say when, like S10's «Empieza» row (FIX-050).
describe("Revisar pago names a Plan that starts later", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says it is her next Plan and when it starts, before and after confirming", async () => {
    const startsOn = civilIn(55);
    const screen = await reviewAndConfirm(reviewOf({ startsOn, nextPlan: true }));
    const day = formatCivilDayMonth(startsOn);

    expect(screen.getByText("Plan siguiente")).toBeOnTheScreen();
    expect(screen.getByText(`Empieza el ${day}`)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago" }));
    await waitFor(() =>
      expect(screen.getByText(`Plan siguiente programado desde el ${day}`)).toBeOnTheScreen(),
    );
  });

  it("says the chosen later Start Date of a first Plan", async () => {
    const startsOn = civilIn(5);
    const screen = await reviewAndConfirm(reviewOf({ startsOn, nextPlan: false }));
    const day = formatCivilDayMonth(startsOn);

    expect(screen.queryByText("Plan siguiente")).toBeNull();
    expect(screen.getByText("Empieza")).toBeOnTheScreen();
    expect(screen.getByText(day)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago" }));
    await waitFor(() =>
      expect(screen.getByText(`Plan programado desde el ${day}`)).toBeOnTheScreen(),
    );
  });

  it("adds no row for a Plan that starts today", async () => {
    const screen = await reviewAndConfirm(reviewOf({ startsOn: civilIn(0), nextPlan: false }));

    expect(screen.queryByText("Plan siguiente")).toBeNull();
    expect(screen.queryByText("Empieza")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago" }));
    await waitFor(() => expect(screen.getByText("Pago confirmado")).toBeOnTheScreen());
  });

  it.each([
    ["a rejected transfer", { state: "rejected" }],
    ["a voided sale", { state: "voided" }],
    ["an Evaluation", { kind: "evaluation", planName: "Evaluación nutricional" }],
  ])("names no start for %s", async (_name, change) => {
    const screen = await reviewAndConfirm(
      reviewOf({ startsOn: civilIn(20), nextPlan: true, ...change }),
    );

    expect(screen.queryByText("Plan siguiente")).toBeNull();
    expect(screen.queryByText("Empieza")).toBeNull();
  });
});
