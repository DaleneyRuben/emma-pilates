import { cleanup, fireEvent, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, encodeBase64 } from "@pilates/mobile-core";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse, routeFetcher } from "../test-support";
import { baseRoutes, intent, openPlanDetail, payment, receiptBytes } from "./purchase-test-support";

jest.setTimeout(30_000);

const ana = { taxId: "4567891", name: "Ana Pérez" };

// The receipt is uploaded, verified, and attached in one go.
const receiptRoutes = {
  "POST /api/v1/uploads": () =>
    jsonResponse(
      {
        id: "asset-1",
        uploadUrl: "/api/v1/uploads/asset-1/object",
        expiresAt: "2026-09-21T15:15:00.000Z",
      },
      201,
    ),
  "PUT /api/v1/uploads/asset-1/object": () => new Response(null, { status: 204 }),
  "POST /api/v1/uploads/asset-1/finalize": () =>
    jsonResponse({ id: "asset-1", state: "processing" }, 202),
  "/api/v1/uploads/asset-1": () =>
    jsonResponse({ id: "asset-1", state: "ready", mediaType: "image/jpeg" }),
  "POST /api/v1/purchase-intents/intent-1/receipt": () =>
    jsonResponse({ ...intent, receiptAttached: true }),
  "/api/v1/payments/current": () => jsonResponse(payment),
};

async function openPaymentWithReceipt(prefill: typeof ana | null) {
  const submitted = jest.fn();
  const screen = await openPlanDetail(
    routeFetcher({
      ...baseRoutes(0),
      ...receiptRoutes,
      "/api/v1/clients/current/invoice-data": () => jsonResponse({ invoiceData: prefill }),
      "POST /api/v1/purchase-intents": () => jsonResponse(intent, 201),
      "POST /api/v1/purchase-intents/intent-1/submit": (init) => {
        submitted(JSON.parse(String(init?.body)));
        return jsonResponse(payment, 201);
      },
    }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Continuar al pago" }));
  await waitFor(() => {
    expect(screen.getByText("Datos para la factura")).toBeOnTheScreen();
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Sube tu comprobante de transferencia" }),
  );
  await waitFor(
    () => {
      expect(screen.getByLabelText("Comprobante adjunto")).toBeOnTheScreen();
    },
    { timeout: 10_000 },
  );
  return { screen, submitted };
}

// PAY-007, design follow-up 145: `10` asks for the invoice data.
describe("Client payment invoice data", () => {
  beforeEach(() => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///receipt.png", mimeType: "image/png", width: 10, height: 10 }],
    } as never);
    jest
      .mocked(ImageManipulator.manipulateAsync)
      .mockResolvedValue({ uri: "file:///receipt.jpg", width: 10, height: 10 });
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(encodeBase64(receiptBytes));
  });

  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(FileSystem.readAsStringAsync).mockReset();
  });

  it("prefills her last sale's data and sends it with the transfer", async () => {
    const { screen, submitted } = await openPaymentWithReceipt(ana);

    expect(screen.getByRole("button", { name: "Con factura" })).toBeSelected();
    expect(screen.getByLabelText("NIT o CI")).toHaveProp("value", "4567891");
    expect(screen.getByLabelText("Nombre o razón social")).toHaveProp("value", "Ana Pérez");
    expect(
      screen.getByText("Usamos los datos de tu última compra. Puedes cambiarlos."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith({ invoiceData: ana });
    });
  });

  it("sends «Sin factura» when nothing was prefilled", async () => {
    const { screen, submitted } = await openPaymentWithReceipt(null);

    expect(screen.getByRole("button", { name: "Sin factura" })).toBeSelected();
    expect(screen.getByText("Tu compra se registra sin datos de factura.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith({ invoiceData: null });
    });
  });

  it("waits for both fields once «Con factura» is chosen", async () => {
    const { screen, submitted } = await openPaymentWithReceipt(null);

    await fireEvent.press(screen.getByRole("button", { name: "Con factura" }));
    expect(screen.getByRole("button", { name: "Enviar comprobante" })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("NIT o CI"), "1020304050");
    await fireEvent.changeText(screen.getByLabelText("Nombre o razón social"), "Estudio Ana SRL");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith({
        invoiceData: { taxId: "1020304050", name: "Estudio Ana SRL" },
      });
    });
  });
});
