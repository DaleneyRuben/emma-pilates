import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { brand, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import {
  assistantRoutes,
  expiredOverview,
  openLucia,
  overview,
  planQuotes,
  subscription,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

jest.mock("./load-receipt-upload", () => ({
  loadReceiptUpload: async () => ({
    chooseTransferReceipt: async () => ({ imageAssetId: "asset-1" }),
  }),
}));

const png = () =>
  new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });

// The founder price of a 12-class Plan, as on board E3C.
const founderQuotes = {
  ...planQuotes,
  plans: [{ ...planQuotes.plans[1], priceCentavos: 69_700, listPriceCentavos: 82_000 }],
};

type Node = { children?: (Node | string)[] | null; props?: { style?: unknown } } | string | null;

function backgrounds(node: Node | Node[]): string[] {
  if (node === null || typeof node === "string") return [];
  if (Array.isArray(node)) return node.flatMap(backgrounds);
  const style = Object.assign({}, ...[node.props?.style].flat(Infinity).filter(Boolean)) as {
    backgroundColor?: string;
    height?: number;
  };
  const own =
    style.backgroundColor === undefined || style.height === 1 ? [] : [style.backgroundColor];
  return [...own, ...(node.children ?? []).flatMap((child) => backgrounds(child))];
}

async function openRegisterPayment(extra: Record<string, (init?: RequestInit) => Response> = {}) {
  const screen = await openLucia({
    ...assistantRoutes(),
    "/api/v1/assistant/clients/client-lucia": () => jsonResponse(expiredOverview),
    "/api/v1/assistant/clients/client-lucia/plan-quotes": () => jsonResponse(founderQuotes),
    "/api/v1/transfer-instructions/qr": png,
    ...extra,
  });
  await fireEvent.press(screen.getByRole("button", { name: "Registrar pago" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Paquete de 12 clases,/ }));
  await waitFor(() => expect(screen.getByLabelText("Registrar pago")).toBeOnTheScreen());
  return screen;
}

// Staff pick E3 C: what is collected on top, big options and one button.
describe("Registrar pago, pick E3 C", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("leads with the Client, the Plan and «A cobrar» on the 600 hero", async () => {
    const screen = await openRegisterPayment();

    const block = screen.getByTestId("payment-charge-block");
    expect(block).toHaveStyle({ backgroundColor: brand.rosaProfundo });
    const inside = within(block);
    expect(inside.getByText("Lucía Fernández · Paquete de 12 clases")).toBeOnTheScreen();
    expect(inside.getByText("LF")).toBeOnTheScreen();
    expect(inside.getByText("A cobrar")).toBeOnTheScreen();
    expect(inside.getByText("Bs 697")).toBeOnTheScreen();
    expect(inside.getByText("12 clases · Bs 820")).toBeOnTheScreen();
    expect(inside.getByText("Descuento · −Bs 123")).toBeOnTheScreen();
  });

  it("offers Efectivo and QR as large options that say what happens next", async () => {
    const screen = await openRegisterPayment();

    const cash = screen.getByRole("radio", { name: /^Efectivo/ });
    const qr = screen.getByRole("radio", { name: /^QR/ });
    expect(cash).toHaveProp("accessibilityState", { checked: true, disabled: false });
    expect(cash).toHaveStyle({ backgroundColor: brand.rosaProfundo });
    expect(qr).toHaveStyle({ backgroundColor: brand.white, borderColor: brand.arcilla });
    expect(screen.getByText("Entra a la caja de hoy")).toBeOnTheScreen();
    expect(screen.getByText("Subes el comprobante")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Confirmar Bs 697 en efectivo" })).toBeEnabled();

    await fireEvent.press(qr);
    expect(screen.getByRole("radio", { name: /^QR/ })).toHaveStyle({
      backgroundColor: brand.rosaProfundo,
    });
    expect(screen.queryByRole("button", { name: "Confirmar Bs 697 en efectivo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Confirmar Bs 697 por QR" })).toBeDisabled();
    expect(screen.getByText("Primero fotografía el comprobante")).toBeOnTheScreen();
  });

  it("sends the photographed receipt from the one «por QR» button", async () => {
    const sent = jest.fn();
    const screen = await openRegisterPayment({
      "POST /api/v1/assistant/clients/client-lucia/transfer-payments": (init) => {
        sent(JSON.parse(String(init?.body)));
        return jsonResponse({ id: "payment-1", state: "pending" }, 201);
      },
    });

    await fireEvent.press(screen.getByRole("radio", { name: /^QR/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Fotografiar comprobante" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirmar Bs 697 por QR" })).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar Bs 697 por QR" }));

    await waitFor(() => expect(screen.getByText("Comprobante enviado")).toBeOnTheScreen());
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ planId: "plan-12", imageAssetId: "asset-1" }),
    );
  });

  it("asks for the invoice with a «Pide factura» switch that shows the NIT and the name", async () => {
    const paid = jest.fn();
    const screen = await openRegisterPayment({
      "/api/v1/assistant/clients/client-lucia/invoice-data": () =>
        jsonResponse({ invoiceData: null }),
      "POST /api/v1/assistant/clients/client-lucia/cash-payments": (init) => {
        paid(JSON.parse(String(init?.body)));
        return jsonResponse({ code: "service_unavailable" }, 503);
      },
    });

    const toggle = screen.getByRole("switch", { name: "Pide factura" });
    expect(toggle).toHaveProp("accessibilityState", { checked: false });
    expect(screen.queryByLabelText("NIT o CI")).toBeNull();

    await fireEvent.press(toggle);
    expect(screen.getByRole("switch", { name: "Pide factura" })).toHaveProp("accessibilityState", {
      checked: true,
    });
    expect(screen.getByRole("button", { name: "Confirmar Bs 697 en efectivo" })).toBeDisabled();
    expect(screen.getByText("Completa el NIT o CI, o cierra la factura")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("NIT o CI"), "1020304050");
    await fireEvent.changeText(screen.getByLabelText("Nombre o razón social"), "Estudio Ana SRL");
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar Bs 697 en efectivo" }));

    await waitFor(() =>
      expect(paid).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceData: { taxId: "1020304050", name: "Estudio Ana SRL" },
        }),
      ),
    );
    // The transfer API takes no invoice data, so the switch is for cash only.
    await fireEvent.press(screen.getByRole("radio", { name: /^QR/ }));
    expect(screen.queryByRole("switch", { name: "Pide factura" })).toBeNull();
  });

  it("titles the days «Empieza» and notes the current Plan's end on a renewal", async () => {
    const screen = await openRegisterPayment({
      "/api/v1/assistant/clients/client-lucia": () =>
        jsonResponse({
          ...overview,
          subscription: { status: "active", subscription, renewalStartsOn: "2026-10-13" },
        }),
      "/api/v1/studio-rules": () =>
        jsonResponse({ cancellationWindowHours: 2.5, openingDate: null, startDateLimitDays: 14 }),
    });

    expect(screen.getByText("Empieza")).toBeOnTheScreen();
    expect(screen.getByText("el actual vence el lun 12 oct")).toBeOnTheScreen();
    expect(screen.getByTestId("start-date-2026-10-13")).toHaveProp("accessibilityState", {
      selected: true,
    });
  });

  // Rosa Emma: Crema is no card colour any more; cards are white.
  it("paints no Crema card anywhere on the screen", async () => {
    const screen = await openRegisterPayment();

    expect(backgrounds(screen.toJSON() as Node)).not.toContain(brand.crema);
    await fireEvent.press(screen.getByRole("radio", { name: /^QR/ }));
    expect(backgrounds(screen.toJSON() as Node)).not.toContain(brand.crema);
  });
});
