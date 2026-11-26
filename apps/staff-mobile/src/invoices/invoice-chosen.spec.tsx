import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

const mockPickImage = jest.fn();
const mockUploadImage = jest.fn();
jest.mock("../uploads/load-image-upload", () => ({
  loadImageUpload: () =>
    Promise.resolve({ pickImage: mockPickImage, uploadImage: mockUploadImage }),
}));
const mockPickPdf = jest.fn();
jest.mock("../uploads/load-document-upload", () => ({
  loadDocumentUpload: () => Promise.resolve({ pickPdf: mockPickPdf }),
}));

jest.setTimeout(20_000);

// Jest's Modal never reports its dismissal: the sheet's one-second fallback.
const sheetClosed = () => act(() => new Promise((resolve) => setTimeout(resolve, 1100)));

const paymentId = "payment-9";
const waiting = {
  paymentId,
  clientId: "client-9",
  clientName: "Mariana Quiroga",
  purchaseLabel: "Paquete de 8 clases",
  amountDueCentavos: 50_200,
  method: "transfer",
  confirmedAt: "2026-11-25T23:40:00.000Z",
  voided: false,
  invoiceData: { taxId: "123456", name: "Mariana Quiroga" },
  invoiceIssued: null,
  file: null,
};
const twoPages = new TextEncoder().encode(
  "%PDF-1.4 1 0 obj << /Type /Pages /Count 2 >> 2 0 obj << /Type /Page >> 3 0 obj << /Type /Page >>",
);

const openInvoice = async () => {
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
          [`/api/v1/staff/payments/${paymentId}/invoice`]: () => jsonResponse(waiting),
        }),
        "administrator",
      )}
    />,
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Facturas por subir, 1" }));
  await fireEvent.press(await screen.findByRole("button", { name: /Mariana Quiroga, NIT 123456/ }));
  return screen;
};

// Walkthrough n.º 24 (E-D19, E-D27, E-D28, E-D30): the dashed box opens the
// sheet too; a chosen file shows first, with «Cambiar» and the ×, and only
// «Subir factura» sends it.
describe("Factura del pago before uploading", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.clearAllMocks();
  });

  it("opens the choice from the dashed box and names the button «Elegir factura»", async () => {
    const screen = await openInvoice();

    expect(
      await screen.findByText("Toca para elegir un PDF o una imagen, hasta 10 MB"),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Elegir factura" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Subir factura" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Sube la factura emitida" }));

    expect(await screen.findByRole("button", { name: "Elegir una imagen" })).toBeOnTheScreen();
  });

  it("shows a chosen PDF with its pages and size before sending it", async () => {
    mockPickPdf.mockResolvedValue({
      uri: "file:///cache/factura-000123.pdf",
      bytes: twoPages,
      mediaType: "application/pdf",
      fileName: "factura-000123.pdf",
    });
    const screen = await openInvoice();

    await fireEvent.press(await screen.findByRole("button", { name: "Elegir factura" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir un PDF" }));
    await sheetClosed();

    expect(await screen.findByText("factura-000123.pdf")).toBeOnTheScreen();
    expect(screen.getByText("PDF · 2 páginas · 1 KB")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Subir factura" })).toBeOnTheScreen();
    expect(mockUploadImage).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Quitar archivo" }));

    expect(await screen.findByRole("button", { name: "Elegir factura" })).toBeOnTheScreen();
    expect(screen.queryByText("factura-000123.pdf")).toBeNull();
  });

  // Review: a new pick while «Subir factura» sends the old one would be lost.
  it("locks «Cambiar» and the × while the file is being sent", async () => {
    mockPickPdf.mockResolvedValue({
      uri: "file:///cache/factura-000123.pdf",
      bytes: twoPages,
      mediaType: "application/pdf",
      fileName: "factura-000123.pdf",
    });
    mockUploadImage.mockReturnValue(new Promise(() => undefined));
    const screen = await openInvoice();

    await fireEvent.press(await screen.findByRole("button", { name: "Elegir factura" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir un PDF" }));
    await sheetClosed();
    await fireEvent.press(await screen.findByRole("button", { name: "Subir factura" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Cambiar" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Quitar archivo" })).toBeDisabled();
  });

  it("shows a chosen photo, opens it big, and changes it from there", async () => {
    mockPickImage.mockResolvedValue({ uri: "file:///factura.jpg", bytes: new Uint8Array([1]) });
    const screen = await openInvoice();

    await fireEvent.press(await screen.findByRole("button", { name: "Elegir factura" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir una imagen" }));
    await sheetClosed();

    expect(await screen.findByText("Factura lista")).toBeOnTheScreen();
    expect(screen.getByText("Foto · toca la miniatura para verla")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cambiar" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Ver factura en grande" }));

    expect(await screen.findByText("Tu factura")).toBeOnTheScreen();
    expect(
      screen.getByText("Pellizca para ampliar. Revisa que se lean el NIT, el nombre y el monto."),
    ).toBeOnTheScreen();
    await fireEvent.press(
      within(screen.getByTestId("full-screen-image")).getByRole("button", { name: "Cambiar" }),
    );

    expect(await screen.findByRole("button", { name: "Elegir un PDF" })).toBeOnTheScreen();
  });
});
