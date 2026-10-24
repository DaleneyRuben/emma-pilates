import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, expiredOverview, openLucia } from "./assistant-fixtures";

jest.setTimeout(20_000);

const company = { taxId: "1020304050", name: "Estudio Ana SRL" };

const cashResult = {
  payment: {
    id: "payment-cash",
    method: "cash",
    state: "confirmed",
    planId: "plan-8",
    planName: "Paquete de 8 clases",
    durationMonths: 1,
    classAllowance: 8,
    planPriceCentavos: 56_000,
    creditAppliedCentavos: 6_000,
    amountDueCentavos: 50_000,
    submittedAt: "2026-09-22T20:00:00.000Z",
    decidedAt: "2026-09-22T20:00:00.000Z",
    rejectionReason: null,
    subscriptionId: "subscription-2",
  },
  subscription: null,
};

async function openConfirmation(prefill: typeof company | null) {
  const paid = jest.fn();
  const screen = await openLucia({
    ...assistantRoutes(),
    "/api/v1/assistant/clients/client-lucia": () => jsonResponse(expiredOverview),
    "/api/v1/assistant/clients/client-lucia/invoice-data": () =>
      jsonResponse({ invoiceData: prefill }),
    "POST /api/v1/assistant/clients/client-lucia/cash-payments": (init) => {
      paid(JSON.parse(String(init?.body)));
      return jsonResponse(cashResult, 201);
    },
  });
  await fireEvent.press(screen.getByRole("button", { name: "Registrar pago en efectivo" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Paquete de 8 clases" })).toBeOnTheScreen();
  });
  await fireEvent.press(screen.getByRole("button", { name: "Paquete de 8 clases" }));
  await waitFor(() => {
    expect(screen.getByText("Datos para la factura")).toBeOnTheScreen();
  });
  return { screen, paid };
}

// PAY-007, design follow-up 146: `S10` takes the invoice data with the cash.
describe("Cash payment invoice data", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("prefills the Client's last sale and records it with the cash", async () => {
    const { screen, paid } = await openConfirmation(company);

    await waitFor(() => {
      expect(screen.getByLabelText("NIT o CI")).toHaveProp("value", "1020304050");
    });
    expect(screen.getByRole("button", { name: "Con factura" })).toBeSelected();
    expect(screen.getByLabelText("Nombre o razón social")).toHaveProp("value", "Estudio Ana SRL");
    expect(
      screen.getByText("Datos de su última compra. Confírmalos con la clienta."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago recibido" }));

    await waitFor(() => {
      expect(screen.getByText("¡Pago registrado!")).toBeOnTheScreen();
    });
    expect(paid).toHaveBeenCalledWith({
      planId: "plan-8",
      branchId: "branch-centro",
      invoiceData: company,
    });
  });

  it("records «Sin factura» when the Client has no earlier invoice data", async () => {
    const { screen, paid } = await openConfirmation(null);

    expect(screen.getByRole("button", { name: "Sin factura" })).toBeSelected();
    expect(screen.getByText("La venta se registra sin datos de factura.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago recibido" }));

    await waitFor(() => {
      expect(paid).toHaveBeenCalledWith({
        planId: "plan-8",
        branchId: "branch-centro",
        invoiceData: null,
      });
    });
  });

  it("waits for the NIT or CI and the name once «Con factura» is chosen", async () => {
    const { screen, paid } = await openConfirmation(null);

    await fireEvent.press(screen.getByRole("button", { name: "Con factura" }));

    expect(screen.getByRole("button", { name: "Confirmar pago recibido" })).toBeDisabled();
    expect(paid).not.toHaveBeenCalled();
  });
});
