import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, expiredOverview, openLucia } from "./assistant-fixtures";

jest.setTimeout(20_000);

jest.mock("./load-receipt-upload", () => ({
  loadReceiptUpload: async () => ({
    photographTransferReceipt: async () => ({ imageAssetId: "asset-1" }),
  }),
}));

const png = () =>
  new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });

async function openRegisterPayment(extra: Record<string, (init?: RequestInit) => Response>) {
  const screen = await openLucia({
    ...assistantRoutes(),
    "/api/v1/assistant/clients/client-lucia": () => jsonResponse(expiredOverview),
    "/api/v1/transfer-instructions/qr": png,
    ...extra,
  });
  await fireEvent.press(screen.getByRole("button", { name: "Registrar pago en efectivo" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 8 clases,/ }));
  await waitFor(() => expect(screen.getByLabelText("Registrar pago")).toBeOnTheScreen());
  return screen;
}

// Walkthrough 21: one «¿Cómo paga?» choice; the photo alone never sends (FIX-028).
describe("Registrar pago by QR (S10)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the studio QR and sends the photographed receipt only on «Enviar comprobante»", async () => {
    const sent = jest.fn();
    const screen = await openRegisterPayment({
      "POST /api/v1/assistant/clients/client-lucia/transfer-payments": (init) => {
        sent(JSON.parse(String(init?.body)));
        return jsonResponse({ id: "payment-1", state: "pending" }, 201);
      },
    });

    await fireEvent.press(screen.getByRole("tab", { name: "QR" }));
    expect(screen.getByText("Monto exacto a transferir")).toBeOnTheScreen();
    expect(screen.getByLabelText("QR del estudio para transferir")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Confirmar pago en efectivo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar comprobante" })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Fotografiar comprobante" }));
    await waitFor(() => expect(screen.getByText("Comprobante fotografiado")).toBeOnTheScreen());
    expect(screen.getByText("Todavía no se envió")).toBeOnTheScreen();
    expect(sent).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));
    await waitFor(() => expect(screen.getByText("Comprobante enviado")).toBeOnTheScreen());
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "plan-8",
        branchId: "branch-centro",
        imageAssetId: "asset-1",
      }),
    );
    expect(screen.getByText("En revisión")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Administración lo revisa y activa el plan de Lucía. No entra en la caja de hoy.",
      ),
    ).toBeOnTheScreen();
  });

  it("says why the cash is refused while a receipt is in review", async () => {
    const screen = await openRegisterPayment({
      "POST /api/v1/assistant/clients/client-lucia/cash-payments": () =>
        jsonResponse({ code: "payment_pending_exists" }, 409),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Confirmar pago en efectivo" }));
    expect(await screen.findByText("La clienta tiene un pago en revisión.")).toBeOnTheScreen();
    // FIX-028: a receipt is pending, so the cash way is off.
    expect(screen.getByRole("tab", { name: "Efectivo" })).toHaveProp("accessibilityState", {
      disabled: true,
      selected: true,
    });
    expect(screen.getByRole("button", { name: "Confirmar pago en efectivo" })).toBeDisabled();
  });
});
