import { cleanup } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  baseRoutes,
  boliviaInstant,
  day,
  firstDay,
  openProfileRow,
  page,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

// Walkthrough finding 64: «Pagada» is said only once the studio confirmed
// the transfer.
const paid = (paymentState: string | undefined, overrides: Record<string, unknown> = {}) =>
  upcomingEvaluation("evaluation-paid", boliviaInstant(firstDay, "09:00"), {
    included: false,
    priceCentavos: 7_000,
    paymentId: "payment-1",
    paymentState,
    receiptAttached: true,
    cancellable: true,
    reschedulable: false,
    ...overrides,
  });

const openWith = (upcoming: unknown[], past: unknown[] = []) =>
  openProfileRow(
    routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page(upcoming)),
      "/api/v1/evaluations?scope=past": () => jsonResponse(page(past)),
    }),
    "Mis evaluaciones",
  );

describe("The payment state of a paid Evaluation", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says «Pago en revisión» while the transfer is pending", async () => {
    const screen = await openWith([paid("pending")]);

    expect(await screen.findByText("Pago en revisión · cancela hasta 3 h antes")).toBeOnTheScreen();
    expect(screen.queryByText(/^Pagada/)).toBeNull();
  });

  it("offers both Reprogramar and Cancelar evaluación while the transfer is pending", async () => {
    const screen = await openWith([paid("pending", { reschedulable: true })]);

    expect(await screen.findByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar evaluación" })).toBeOnTheScreen();
  });

  it("says «Pago rechazado» once the transfer is rejected", async () => {
    const screen = await openWith([paid("rejected")]);

    expect(await screen.findByText("Pago rechazado · cancela hasta 3 h antes")).toBeOnTheScreen();
  });

  it("says «Pagada» once the transfer is confirmed", async () => {
    const screen = await openWith([paid("confirmed", { cancellable: false, reschedulable: true })]);

    expect(await screen.findByText("Pagada · reprograma hasta 3 h antes")).toBeOnTheScreen();
  });

  it("keeps «Pagada» for a server that does not send the payment state", async () => {
    const screen = await openWith([paid(undefined)]);

    expect(await screen.findByText("Pagada · cancela hasta 3 h antes")).toBeOnTheScreen();
  });

  it("labels a past paid Evaluation whose transfer is still pending", async () => {
    const past = upcomingEvaluation("evaluation-past", new Date(Date.now() - 20 * day), {
      included: false,
      paymentId: "payment-2",
      paymentState: "pending",
    });
    const screen = await openWith([], [past]);

    expect(await screen.findByText("Anteriores")).toBeOnTheScreen();
    expect(screen.getByText("Pago en revisión")).toBeOnTheScreen();
  });
});
