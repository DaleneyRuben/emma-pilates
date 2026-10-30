import { fireEvent, render, waitFor } from "@testing-library/react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

// Shared by the purchase-flow and payment QR specs: a Client with no Plan
// buying «Paquete de 8 clases» by transfer.
export const profile = {
  id: "client-1",
  name: "Mariana Peña",
  email: "mariana@example.com",
  phone: null,
  referralCode: "REF-MARIANA",
};
export const plan = {
  id: "plan-8",
  name: "Paquete de 8 clases",
  durationDays: 30,
  weeklyClassCap: null,
  durationMonths: 1,
  classAllowance: 8,
  priceCentavos: 56_000,
};
export const intent = {
  id: "intent-1",
  planId: plan.id,
  planName: plan.name,
  durationDays: 30,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditReservedCentavos: 0,
  amountDueCentavos: 56_000,
  state: "open",
  receiptAttached: false,
  createdAt: "2026-09-21T15:00:00.000Z",
  expiresAt: "2026-09-22T15:00:00.000Z",
};
export const payment = {
  id: "payment-1",
  method: "transfer",
  state: "pending",
  planId: plan.id,
  planName: plan.name,
  durationDays: 30,
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 56_000,
  creditAppliedCentavos: 0,
  amountDueCentavos: 56_000,
  submittedAt: "2026-09-21T16:00:00.000Z",
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
};
export const instructions = {
  beneficiaryName: "Emma Pilates Studio",
  bankName: "Banco Local",
  accountNumber: "0000000000",
  qrImageUrl: "/api/v1/transfer-instructions/qr",
};
export const receiptBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export const baseRoutes = (credit: number) => ({
  "/api/v1/clients/current": () => jsonResponse(profile),
  "/api/v1/clients/current/subscription": () =>
    jsonResponse({ status: "none", subscription: null }),
  "/api/v1/clients/current/credit": () =>
    jsonResponse({ availableCentavos: credit, reservedCentavos: 0, activity: [] }),
  "/api/v1/plans": () => jsonResponse([plan]),
  "/api/v1/plans/plan-8": () => jsonResponse(plan),
  "/api/v1/purchase-intents/current": () => jsonResponse(intent),
  "/api/v1/transfer-instructions": () => jsonResponse(instructions),
  "/api/v1/transfer-instructions/qr": () =>
    new Response(receiptBytes, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
});

export async function openPlanDetail(fetcher: ReturnType<typeof routeFetcher>) {
  const screen = await render(<App runtime={createClientRuntime(fetcher)} />);
  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: "Comprar un plan" })).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  await fireEvent.press(screen.getByRole("button", { name: "Comprar un plan" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^Paquete de 8 clases,/ })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: /^Paquete de 8 clases,/ }));
  await waitFor(() => {
    expect(screen.getByText("Total a pagar")).toBeOnTheScreen();
  });
  return screen;
}

// A PNG signature followed by an IHDR chunk for the given size.
export function pngHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}
