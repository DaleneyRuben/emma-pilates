import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

const mockPickInvoicePhoto = jest.fn();
jest.mock("./load-invoice-upload", () => ({
  loadInvoiceUpload: () => Promise.resolve({ pickInvoicePhoto: mockPickInvoicePhoto }),
}));

jest.setTimeout(20_000);

const hour = 60 * 60_000;
const yesterdayAt1940 = `${boliviaCivilDate(new Date(Date.now() - 24 * hour))}T23:40:00.000Z`;
const paymentId = "payment-9";

const staffMember = (role: string) => ({
  id: "staff-9",
  name: role === "administrator" ? "Paola Mendoza" : "Ana Gutiérrez",
  email: "staff@example.com",
  phone: null,
  role,
  branches: role === "assistant" ? [{ id: "branch-1", name: "Achumani" }] : [],
});

const waiting = {
  paymentId,
  clientId: "client-9",
  clientName: "Mariana Quiroga",
  purchaseLabel: "Paquete de 8 clases",
  amountDueCentavos: 50_200,
  method: "transfer",
  confirmedAt: yesterdayAt1940,
  voided: false,
  invoiceData: { taxId: "123456", name: "Mariana Quiroga" },
  invoiceIssued: null,
  file: null,
};
const issued = {
  ...waiting,
  invoiceIssued: { issuedAt: yesterdayAt1940, issuedByName: "Ana Gutiérrez" },
  file: {
    fileName: "factura-000123.jpg",
    mediaType: "image/jpeg",
    byteSize: 248_000,
    uploadedAt: yesterdayAt1940,
    uploadedByName: "Ana Gutiérrez",
  },
};

const review = (invoiceData: typeof waiting.invoiceData | null) => ({
  id: "payment-1",
  method: "transfer",
  state: "pending",
  planId: "plan-1",
  planName: "Paquete de 8 clases",
  durationMonths: 1,
  classAllowance: 8,
  planPriceCentavos: 50_200,
  creditAppliedCentavos: 0,
  amountDueCentavos: 50_200,
  submittedAt: yesterdayAt1940,
  decidedAt: null,
  rejectionReason: null,
  subscriptionId: null,
  clientName: "Mariana Quiroga",
  invoiceData,
  receipt: null,
  receiptUrl: null,
});

const pending = {
  id: "payment-1",
  clientName: "Mariana Quiroga",
  planName: "Paquete de 8 clases",
  amountDueCentavos: 50_200,
  submittedAt: yesterdayAt1940,
  receiptAvailable: false,
};

describe("Invoices in the Staff app (FIX-044)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    mockPickInvoicePhoto.mockReset();
  });

  it.each([
    [{ taxId: "123456", name: "Mariana Quiroga" }, "NIT 123456 · Mariana Quiroga"],
    [null, "No la pidió"],
  ])("shows on Revisar pago whether she asked for an invoice", async (data, line) => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () => jsonResponse(staffMember("administrator")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/administrator/payments/pending": () => jsonResponse([pending]),
            "/api/v1/staff/invoices": () => jsonResponse({ items: [] }),
            "/api/v1/administrator/payments/payment-1": () => jsonResponse(review(data)),
          }),
          "administrator",
        )}
      />,
    );

    await fireEvent.press(
      await screen.findByRole("button", { name: "Revisar pago de Mariana Quiroga" }),
    );

    expect(await screen.findByText(line)).toBeOnTheScreen();
    if (data === null) {
      expect(screen.getByText("Sin factura")).toBeOnTheScreen();
    } else {
      expect(
        screen.getByText("Podrás subir la factura cuando confirmes el pago."),
      ).toBeOnTheScreen();
    }
  });

  it("uploads a photo of the invoice from Pagos, then removes it after asking", async () => {
    let current: typeof waiting | typeof issued = waiting;
    const attached = jest.fn();
    const removed = jest.fn();
    mockPickInvoicePhoto.mockResolvedValue({
      imageAssetId: "asset-9",
      fileName: "factura-000123.jpg",
    });
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () => jsonResponse(staffMember("administrator")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/administrator/payments/pending": () => jsonResponse([]),
            "/api/v1/staff/invoices": () =>
              jsonResponse({ items: current.file === null ? [current] : [] }),
            [`/api/v1/staff/payments/${paymentId}/invoice`]: () => jsonResponse(current),
            [`PUT /api/v1/staff/payments/${paymentId}/invoice`]: (init) => {
              attached(JSON.parse(String(init?.body)));
              current = issued;
              return jsonResponse(issued);
            },
            [`DELETE /api/v1/staff/payments/${paymentId}/invoice`]: () => {
              removed();
              current = waiting;
              return jsonResponse(waiting);
            },
          }),
          "administrator",
        )}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Facturas por subir, 1" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: /Mariana Quiroga, NIT 123456/ }),
    );
    expect(await screen.findByText("Sube la factura emitida")).toBeOnTheScreen();
    expect(screen.getByText("Mariana Quiroga")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Subir factura" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir de la galería" }));

    expect(await screen.findByText("Factura subida")).toBeOnTheScreen();
    expect(screen.getByText("factura-000123.jpg")).toBeOnTheScreen();
    expect(mockPickInvoicePhoto).toHaveBeenCalledWith(expect.any(Function), "library");
    expect(attached).toHaveBeenCalledWith({
      imageAssetId: "asset-9",
      fileName: "factura-000123.jpg",
    });

    await fireEvent.press(screen.getByRole("button", { name: "Quitar factura" }));
    expect(await screen.findByText("¿Quitar la factura?")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Sí, quitar factura" }));

    await waitFor(() => expect(removed).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Sube la factura emitida")).toBeOnTheScreen();
  });

  it("says so when the upload fails and offers to retry", async () => {
    mockPickInvoicePhoto.mockRejectedValueOnce(new Error("upload_failed"));
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () => jsonResponse(staffMember("administrator")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/administrator/payments/pending": () => jsonResponse([]),
            "/api/v1/staff/invoices": () => jsonResponse({ items: [waiting] }),
            [`/api/v1/staff/payments/${paymentId}/invoice`]: () => jsonResponse(waiting),
          }),
          "administrator",
        )}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Facturas por subir, 1" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: /Mariana Quiroga, NIT 123456/ }),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Subir factura" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Tomar foto" }));

    expect(
      await screen.findByText(
        "No pudimos subir la factura. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
  });

  it("opens Facturas por subir from Clientes for the Assistant", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () => jsonResponse(staffMember("assistant")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/staff/invoices": () => jsonResponse({ items: [waiting] }),
          }),
          "assistant",
        )}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Facturas por subir, 1" }));

    expect(
      await screen.findByRole("button", { name: /Mariana Quiroga, NIT 123456/ }),
    ).toBeOnTheScreen();
  });
});
