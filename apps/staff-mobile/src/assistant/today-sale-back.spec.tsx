import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { assistantRoutes, expiredOverview } from "./assistant-fixtures";

jest.setTimeout(30_000);

const cashSale = {
  payment: {
    id: "payment-cash",
    method: "cash",
    state: "confirmed",
    planId: "plan-8",
    planName: "Paquete de 8 clases",
    durationDays: 30,
    durationMonths: 1,
    classAllowance: 8,
    planPriceCentavos: 56_000,
    creditAppliedCentavos: 0,
    amountDueCentavos: 56_000,
    submittedAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
    rejectionReason: null,
    subscriptionId: "subscription-2",
  },
  subscription: {
    id: "subscription-2",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 8,
    startsOn: "2026-09-22",
    endsOn: "2026-10-22",
  },
};

// Review of E7: a sale started from «Hoy» ends back on Hoy, the root of that
// tab, never on a Clientas search pushed inside it over the plan just sold.
describe("A sale started from Hoy", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("returns to Hoy from «¡Pago registrado!»", async () => {
    const routes = {
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia": () => jsonResponse(expiredOverview),
      "POST /api/v1/assistant/clients/client-lucia/cash-payments": () =>
        jsonResponse(cashSale, 201),
      "/api/v1/staff/invoices?filter=pending": () => jsonResponse({ items: [] }),
      "/api/v1/cash-closes/today?branchId=branch-centro": () =>
        jsonResponse({
          branchId: "branch-centro",
          businessDate: boliviaCivilDate(new Date()),
          expectedCentavos: 0,
          cashPaymentCount: 0,
          close: null,
        }),
    };
    const screen = await render(
      <App runtime={createStaffRuntime(routeFetcher(routes), "assistant")} />,
    );
    await waitFor(() => expect(screen.getByLabelText("Hoy en Centro")).toBeOnTheScreen());

    await fireEvent.changeText(screen.getByPlaceholderText("Nombre, teléfono o correo"), "luc");
    await fireEvent.press(
      await screen.findByRole("button", { name: "Ver clienta Lucía Fernández" }),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Registrar pago" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Confirmar Bs 560 en efectivo" }),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Volver a Clientas" }));

    await waitFor(() => expect(screen.getByLabelText("Hoy en Centro")).toBeOnTheScreen());
    expect(screen.queryByLabelText("Buscar clienta")).toBeNull();
    expect(screen.queryByLabelText("Elige un plan")).toBeNull();
  });
});
