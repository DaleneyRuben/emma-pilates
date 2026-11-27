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
const pdf = {
  uri: "file:///cache/factura-000123.pdf",
  bytes: new TextEncoder().encode("%PDF-1.4 << /Type /Page >> << /Type /Page >>"),
  mediaType: "application/pdf",
  fileName: "factura-000123.pdf",
};

/** The API draws each PDF page as a PNG (a header is enough here). */
const pngPage = () => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, 1400);
  new DataView(bytes.buffer).setUint32(20, 1980);
  return new Response(bytes, { headers: { "Content-Type": "image/png", "X-Page-Count": "2" } });
};

const deferred = <Value,>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const openWithPdf = async (attached: jest.Mock) => {
  mockPickPdf.mockResolvedValue(pdf);
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
          [`PUT /api/v1/staff/payments/${paymentId}/invoice`]: (init) => {
            attached(JSON.parse(String(init?.body)));
            return jsonResponse({ ...waiting, invoiceIssued: null });
          },
          "/api/v1/staff/invoice-uploads/asset-7/pages/1": pngPage,
          "/api/v1/staff/invoice-uploads/asset-7/pages/2": pngPage,
        }),
        "administrator",
      )}
    />,
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Facturas por subir, 1" }));
  await fireEvent.press(await screen.findByRole("button", { name: /Mariana Quiroga, NIT 123456/ }));
  await fireEvent.press(await screen.findByRole("button", { name: "Elegir factura" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Elegir un PDF" }));
  await sheetClosed();
  return screen;
};

// Walkthrough n.º 24 (E-D29): the chosen PDF uploads at once, with its
// progress, so a tap shows its pages one by one before «Subir factura».
describe("A chosen PDF invoice before sending it", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.clearAllMocks();
  });

  it("uploads it at once, shows the progress, then opens its pages", async () => {
    const upload = deferred<string>();
    mockUploadImage.mockImplementation(
      (_file: unknown, _purpose: unknown, _fetcher: unknown, onProgress: (n: number) => void) => {
        onProgress(0.4);
        return upload.promise;
      },
    );
    const attached = jest.fn();
    const screen = await openWithPdf(attached);

    expect(await screen.findByText("Subiendo factura")).toBeOnTheScreen();
    expect(screen.getByText("40 %")).toBeOnTheScreen();
    expect(mockUploadImage).toHaveBeenCalledWith(
      pdf,
      "invoice",
      expect.any(Function),
      expect.any(Function),
    );

    await act(async () => upload.resolve("asset-7"));
    await fireEvent.press(await screen.findByRole("button", { name: "Ver factura en grande" }));

    const viewer = within(await screen.findByTestId("picked-pdf-viewer"));
    expect(viewer.getByText("factura-000123.pdf")).toBeOnTheScreen();
    expect(await viewer.findByText("Página 1 de 2")).toBeOnTheScreen();
    expect(viewer.getByText("Desliza para pasar de página.")).toBeOnTheScreen();
    expect(await viewer.findByLabelText("Página 2 de la factura")).toBeOnTheScreen();

    await fireEvent.press(viewer.getByRole("button", { name: "Página siguiente" }));
    expect(await viewer.findByText("Página 2 de 2")).toBeOnTheScreen();

    await fireEvent.press(viewer.getByRole("button", { name: "Cerrar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Subir factura" }));

    await waitFor(() =>
      expect(attached).toHaveBeenCalledWith({
        imageAssetId: "asset-7",
        fileName: "factura-000123.pdf",
      }),
    );
    expect(mockUploadImage).toHaveBeenCalledTimes(1);
  });

  it("changes the file from the pages", async () => {
    mockUploadImage.mockResolvedValue("asset-7");
    const screen = await openWithPdf(jest.fn());

    await fireEvent.press(await screen.findByRole("button", { name: "Ver factura en grande" }));
    await fireEvent.press(
      within(await screen.findByTestId("picked-pdf-viewer")).getByRole("button", {
        name: "Cambiar",
      }),
    );

    expect(await screen.findByRole("button", { name: "Elegir un PDF" })).toBeOnTheScreen();
  });

  it("waits for the upload before «Subir factura» sends it", async () => {
    const upload = deferred<string>();
    mockUploadImage.mockReturnValue(upload.promise);
    const attached = jest.fn();
    const screen = await openWithPdf(attached);

    await fireEvent.press(await screen.findByRole("button", { name: "Subir factura" }));
    expect(attached).not.toHaveBeenCalled();

    await act(async () => upload.resolve("asset-7"));

    await waitFor(() =>
      expect(attached).toHaveBeenCalledWith({
        imageAssetId: "asset-7",
        fileName: "factura-000123.pdf",
      }),
    );
    expect(mockUploadImage).toHaveBeenCalledTimes(1);
  });

  it("says when it could not upload and uploads it again", async () => {
    mockUploadImage
      .mockRejectedValueOnce(new Error("upload_failed"))
      .mockResolvedValueOnce("asset-7");
    const attached = jest.fn();
    const screen = await openWithPdf(attached);

    expect(
      await screen.findByText(
        "No pudimos subir la factura. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Elegir otro archivo" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("button", { name: "Ver factura en grande" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Subir factura" })).toBeOnTheScreen();
    expect(mockUploadImage).toHaveBeenCalledTimes(2);
    expect(attached).not.toHaveBeenCalled();
  });
});
