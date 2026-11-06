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
      // No Payment exists until the receipt is sent (follow-up 246: a
      // pending one turns Inicio into «Tu pago está en revisión»).
      "/api/v1/payments/current": () =>
        submitted.mock.calls.length === 0
          ? jsonResponse({ code: "payment_not_found", status: 404 }, 404)
          : jsonResponse(payment),
    }),
  );
  await fireEvent.press(screen.getByTestId("plan-continue-to-payment"));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "¿Necesitas factura?" })).toBeOnTheScreen();
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

  // Walkthrough n.º 14: the invoice is a collapsed «¿Necesitas factura?» row,
  // so a purchase goes without one unless she opens it.
  it("sends no invoice while «¿Necesitas factura?» stays closed", async () => {
    const { screen, submitted } = await openPaymentWithReceipt(ana);

    expect(screen.getByRole("button", { name: "¿Necesitas factura?" })).toHaveProp(
      "accessibilityState",
      { expanded: false },
    );
    expect(screen.queryByLabelText("NIT o CI")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Enviar comprobante" }));

    await waitFor(() => {
      expect(submitted).toHaveBeenCalledWith({ invoiceData: null });
    });
  });

  it("opens prefilled with her last sale's data and sends it", async () => {
    const { screen, submitted } = await openPaymentWithReceipt(ana);

    await fireEvent.press(screen.getByRole("button", { name: "¿Necesitas factura?" }));
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

  it("waits for both fields once the invoice is opened", async () => {
    const { screen, submitted } = await openPaymentWithReceipt(null);

    await fireEvent.press(screen.getByRole("button", { name: "¿Necesitas factura?" }));
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

  // Walkthrough n.º 23, follow-up 246 (C10c): the off button says why.
  it("says what is missing while the open invoice is incomplete", async () => {
    const { screen } = await openPaymentWithReceipt(null);

    await fireEvent.press(screen.getByRole("button", { name: "¿Necesitas factura?" }));
    expect(screen.getByText("Completa el NIT o CI, o cierra la factura")).toBeOnTheScreen();
    expect(screen.queryByText("El estudio revisa tu pago y te avisa por la app")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("NIT o CI"), "1020304050");
    expect(
      screen.getByText("Completa el nombre o razón social, o cierra la factura"),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Nombre o razón social"), "Estudio Ana SRL");
    expect(screen.getByText("El estudio revisa tu pago y te avisa por la app")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar comprobante" })).toBeEnabled();
  });

  it("shows the amount on the hero and the two numbered steps", async () => {
    const { screen } = await openPaymentWithReceipt(null);

    expect(screen.getByTestId("payment-hero")).toHaveStyle({ backgroundColor: "#93615D" });
    expect(screen.getByText("Monto exacto a transferir")).toBeOnTheScreen();
    expect(screen.getByText("1 · Paga con el QR del estudio")).toBeOnTheScreen();
    expect(screen.getByText("2 · Sube tu comprobante")).toBeOnTheScreen();
    expect(screen.getByText("El estudio revisa tu pago y te avisa por la app")).toBeOnTheScreen();
  });
});
