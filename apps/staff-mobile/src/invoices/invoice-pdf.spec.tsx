import { cleanup, fireEvent, render } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const paymentId = "payment-9";
const confirmedAt = "2026-11-05T23:40:00.000Z";
const waiting = {
  paymentId,
  clientId: "client-9",
  clientName: "Mariana Quiroga",
  purchaseLabel: "Paquete de 8 clases",
  amountDueCentavos: 50_200,
  method: "transfer",
  confirmedAt,
  voided: false,
  invoiceData: { taxId: "123456", name: "Mariana Quiroga" },
  invoiceIssued: null,
  file: null,
};
const issuedPdf = {
  ...waiting,
  invoiceIssued: { issuedAt: confirmedAt, issuedByName: "Ana Gutiérrez" },
  file: {
    fileName: "factura-000123.pdf",
    mediaType: "application/pdf",
    byteSize: 248_000,
    uploadedAt: confirmedAt,
    uploadedByName: "Ana Gutiérrez",
  },
};

/** The API draws each PDF page as a PNG (a header is enough here). */
const pngPage = () => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, 1400);
  new DataView(bytes.buffer).setUint32(20, 1980);
  return new Response(bytes, { headers: { "Content-Type": "image/png", "X-Page-Count": "2" } });
};

// FIX-051 (verification n.º 45, design follow-up 256 § 3, V-A3): an uploaded
// PDF shows its first page and opens in the app, instead of «El PDF se abre
// desde la web de administración».
describe("A PDF invoice in the Staff app", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the first page and opens every page", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () =>
              jsonResponse({
                id: "staff-9",
                name: "Paola Mendoza",
                email: "staff@example.com",
                phone: null,
                role: "administrator",
                branches: [],
              }),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/administrator/payments/pending": () => jsonResponse([]),
            "/api/v1/staff/invoices": () => jsonResponse({ items: [waiting] }),
            [`/api/v1/staff/payments/${paymentId}/invoice`]: () => jsonResponse(issuedPdf),
            [`/api/v1/staff/payments/${paymentId}/invoice/file/pages/1`]: pngPage,
            [`/api/v1/staff/payments/${paymentId}/invoice/file/pages/2`]: pngPage,
          }),
          "administrator",
        )}
      />,
    );

    await fireEvent.press(await screen.findByRole("button", { name: "Facturas por subir, 1" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: /Mariana Quiroga, NIT 123456/ }),
    );

    expect(await screen.findByText("factura-000123.pdf")).toBeOnTheScreen();
    expect(screen.queryByText("El PDF se abre desde la web de administración.")).toBeNull();
    await fireEvent.press(await screen.findByRole("button", { name: "Ver la factura, 2 páginas" }));

    expect(await screen.findByText("Factura · 1 de 2")).toBeOnTheScreen();
    expect(await screen.findByLabelText("Página 2 de 2")).toBeOnTheScreen();
  });
});
