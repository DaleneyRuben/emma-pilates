import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

const mockPickImage = jest.fn();
const mockUploadImage = jest.fn();
jest.mock("../uploads/load-image-upload", () => ({
  loadImageUpload: () =>
    Promise.resolve({ pickImage: mockPickImage, uploadImage: mockUploadImage }),
}));
const photo = { uri: "file:///factura.jpg", bytes: new Uint8Array([1, 2, 3]) };
const mockPickPdf = jest.fn();
const mockLoadDocumentUpload = jest.fn(() => Promise.resolve({ pickPdf: mockPickPdf }));
jest.mock("../uploads/load-document-upload", () => ({
  loadDocumentUpload: () => mockLoadDocumentUpload(),
}));
const pdf = {
  uri: "file:///cache/factura-000123.pdf",
  bytes: new Uint8Array([37, 80, 68, 70]),
  mediaType: "application/pdf",
  fileName: "factura-000123.pdf",
};

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
    mockPickImage.mockReset();
    mockUploadImage.mockReset();
    mockPickPdf.mockReset();
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
    mockPickImage.mockResolvedValue(photo);
    mockUploadImage.mockResolvedValue("asset-9");
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
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir una imagen" }));

    expect(await screen.findByText("Factura subida")).toBeOnTheScreen();
    expect(screen.getByText("factura-000123.jpg")).toBeOnTheScreen();
    expect(mockPickImage).toHaveBeenCalledWith();
    expect(mockUploadImage).toHaveBeenCalledWith(photo, "invoice", expect.any(Function));
    expect(attached).toHaveBeenCalledWith({ imageAssetId: "asset-9", fileName: "factura.jpg" });

    await fireEvent.press(screen.getByRole("button", { name: "Quitar factura" }));
    expect(await screen.findByText("¿Quitar la factura?")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Sí, quitar factura" }));

    await waitFor(() => expect(removed).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Sube la factura emitida")).toBeOnTheScreen();
  });

  // FIX-049: E5's third choice, «Elegir un PDF», from the phone's files.
  const openUpload = async (fetcher: Parameters<typeof createStaffRuntime>[0]) => {
    const screen = await render(<App runtime={createStaffRuntime(fetcher, "administrator")} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Facturas por subir, 1" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: /Mariana Quiroga, NIT 123456/ }),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Subir factura" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir un PDF" }));
    return screen;
  };
  const uploadRoutes = (attached: jest.Mock) =>
    routeFetcher({
      "/api/v1/staff-members/current": () => jsonResponse(staffMember("administrator")),
      "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
      "/api/v1/administrator/payments/pending": () => jsonResponse([]),
      "/api/v1/staff/invoices": () => jsonResponse({ items: [waiting] }),
      [`/api/v1/staff/payments/${paymentId}/invoice`]: () => jsonResponse(waiting),
      [`PUT /api/v1/staff/payments/${paymentId}/invoice`]: (init) => {
        attached(JSON.parse(String(init?.body)));
        return jsonResponse({
          ...issued,
          file: { ...issued.file, fileName: "factura-000123.pdf", mediaType: "application/pdf" },
        });
      },
    });

  it("uploads a PDF of the invoice picked from the phone, with its name", async () => {
    const attached = jest.fn();
    mockPickPdf.mockResolvedValue(pdf);
    mockUploadImage.mockResolvedValue("asset-10");

    const screen = await openUpload(uploadRoutes(attached));

    expect(await screen.findByText("Factura subida")).toBeOnTheScreen();
    expect(mockPickImage).not.toHaveBeenCalled();
    expect(mockUploadImage).toHaveBeenCalledWith(pdf, "invoice", expect.any(Function));
    expect(attached).toHaveBeenCalledWith({
      imageAssetId: "asset-10",
      fileName: "factura-000123.pdf",
    });
  });

  it("refuses a PDF the studio cannot take, with what it does take", async () => {
    mockPickPdf.mockRejectedValue(new Error("upload_rejected"));

    const screen = await openUpload(uploadRoutes(jest.fn()));

    expect(
      await screen.findByText("Este archivo no sirve. Sube un PDF, JPG o PNG de hasta 10 MB."),
    ).toBeOnTheScreen();
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("asks to update the app when this build has no file picker yet", async () => {
    mockLoadDocumentUpload.mockRejectedValueOnce(new Error("Cannot find native module"));

    const screen = await openUpload(uploadRoutes(jest.fn()));

    expect(
      await screen.findByText(
        "Para subir un PDF, actualiza la app. Mientras tanto puedes subir una foto.",
      ),
    ).toBeOnTheScreen();
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("says so when the upload fails and offers to retry", async () => {
    mockPickImage.mockResolvedValue(photo);
    mockUploadImage.mockRejectedValueOnce(new Error("upload_failed"));
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
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir una imagen" }));

    expect(
      await screen.findByText(
        "No pudimos subir la factura. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeOnTheScreen();
  });

  // Walkthrough n.º 25: a picker that fails is not a connection problem.
  it("says the files could not be opened when the picker fails", async () => {
    mockPickPdf.mockRejectedValueOnce(new Error("Another picker is already presented"));

    const screen = await openUpload(uploadRoutes(jest.fn()));

    expect(
      await screen.findByText("No pudimos abrir tus archivos. Inténtalo de nuevo."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Revisa tu conexión/)).not.toBeOnTheScreen();
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("opens Facturas por subir from Clientas for the Assistant", async () => {
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

  it("keeps Facturas por subir on Clientas when none is waiting, to reach Subidas", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () => jsonResponse(staffMember("coordinator")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/staff/invoices": () => jsonResponse({ items: [] }),
          }),
          "coordinator",
        )}
      />,
    );

    expect(await screen.findByRole("button", { name: "Facturas por subir" })).toBeOnTheScreen();
  });

  it("retries only the attach when the upload already worked", async () => {
    mockPickImage.mockResolvedValue(photo);
    mockUploadImage.mockResolvedValue("asset-9");
    let attempts = 0;
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            "/api/v1/staff-members/current": () => jsonResponse(staffMember("administrator")),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
            "/api/v1/administrator/payments/pending": () => jsonResponse([]),
            "/api/v1/staff/invoices": () => jsonResponse({ items: [waiting] }),
            [`/api/v1/staff/payments/${paymentId}/invoice`]: () => jsonResponse(waiting),
            [`PUT /api/v1/staff/payments/${paymentId}/invoice`]: () => {
              attempts += 1;
              return attempts === 1 ? jsonResponse({ code: "oops" }, 503) : jsonResponse(issued);
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
    await fireEvent.press(await screen.findByRole("button", { name: "Subir factura" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Elegir una imagen" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Factura subida")).toBeOnTheScreen();
    expect(attempts).toBe(2);
    expect(mockPickImage).toHaveBeenCalledTimes(1);
    expect(mockUploadImage).toHaveBeenCalledTimes(1);
  });
});
