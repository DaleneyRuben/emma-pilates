import type { StaffInvoiceDto } from "@pilates/api-contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  paymentPage,
  paymentRow,
  paymentsPath,
  pendingBadgeHandler,
} from "../test/payment-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import {
  uploadedAssetId,
  uploadHandlers,
  type UploadSeen,
} from "../test/upload-fixtures";

const mariana = { taxId: "123456", name: "Mariana Quiroga" };
const confirmed = paymentRow("31", "Mariana Quiroga", {
  method: "transfer",
  state: "confirmed",
  amountDueCentavos: 50_200,
  decidedAt: "2026-11-05T13:30:00.000Z",
  invoiceData: mariana,
});
const invoicePath = `/api/v1/staff/payments/${confirmed.id}/invoice`;

const view = (extra: Partial<StaffInvoiceDto> = {}): StaffInvoiceDto => ({
  paymentId: confirmed.id,
  clientId: confirmed.clientId,
  clientName: "Mariana Quiroga",
  purchaseLabel: "Paquete de 8 clases",
  amountDueCentavos: 50_200,
  method: "transfer",
  confirmedAt: "2026-11-05T13:30:00.000Z",
  voided: false,
  invoiceData: mariana,
  invoiceIssued: null,
  file: null,
  ...extra,
});
const uploaded = view({
  invoiceIssued: {
    issuedAt: "2026-11-05T14:42:00.000Z",
    issuedByName: "Paola Mendoza",
  },
  file: {
    fileName: "factura-000123.pdf",
    mediaType: "application/pdf",
    byteSize: 253_952,
    uploadedAt: "2026-11-05T14:42:00.000Z",
    uploadedByName: "Paola Mendoza",
  },
});

const pdf = (name = "factura-000123.pdf", type = "application/pdf") =>
  new File([new Uint8Array([37, 80, 68, 70, 45])], name, { type });

const open = async () => {
  const rendered = renderAdmin("/dinero/pagos?status=all");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Mariana Quiroga" }),
  );
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Factura" }),
  };
};

// FIX-044 (design follow-up 248, W1/W2): the issued invoice is uploaded on
// the payment's panel and replaces the plain «Marcar emitida».
describe("Dinero › Pagos invoice upload", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), pendingBadgeHandler(0));
    server.use(
      http.get(apiUrl(paymentsPath), ({ request }) =>
        new URL(request.url).searchParams.get("pageSize") === "1"
          ? undefined
          : jsonResponse(paymentPage([confirmed])),
      ),
    );
  });

  it("uploads a PDF from the panel and shows it issued", async () => {
    const seen: UploadSeen = { polls: 0 };
    let attached: unknown;
    server.use(
      http.get(apiUrl(invoicePath), () => jsonResponse(view())),
      ...uploadHandlers(seen),
      http.put(apiUrl(invoicePath), async ({ request }) => {
        attached = await request.json();
        return jsonResponse(uploaded);
      }),
    );
    const { user, panel } = await open();

    expect(within(panel).getByText("123456")).toBeVisible();
    expect(within(panel).getByText("Por emitir")).toBeVisible();
    await user.upload(
      within(panel).getByLabelText("Archivo de la factura"),
      pdf(),
    );

    expect(
      await within(panel).findByRole("link", { name: "Descargar factura" }),
    ).toBeVisible();
    expect(within(panel).getByText("factura-000123.pdf")).toBeVisible();
    expect(within(panel).getByText(/subida por Paola Mendoza/)).toBeVisible();
    expect(within(panel).getByText("Emitida")).toBeVisible();
    expect(attached).toEqual({
      imageAssetId: uploadedAssetId,
      fileName: "factura-000123.pdf",
    });
    expect(seen.declared).toMatchObject({
      purpose: "invoice",
      mediaType: "application/pdf",
    });
    expect(
      within(panel).getByRole("link", { name: "Descargar factura" }),
    ).toHaveAttribute("href", expect.stringContaining(`${invoicePath}/file`));
  });

  it("refuses a file that is not a PDF, JPG or PNG before uploading", async () => {
    const seen: UploadSeen = { polls: 0 };
    server.use(
      http.get(apiUrl(invoicePath), () => jsonResponse(view())),
      ...uploadHandlers(seen),
    );
    const { panel } = await open();

    fireEvent.change(within(panel).getByLabelText("Archivo de la factura"), {
      target: { files: [pdf("factura.docx", "application/msword")] },
    });

    expect(
      await within(panel).findByText(
        "Este archivo no sirve. Sube un PDF, JPG o PNG de hasta 10 MB.",
      ),
    ).toBeVisible();
    expect(seen.declared).toBeUndefined();
  });

  it("says so when the upload fails and lets her retry", async () => {
    const seen: UploadSeen = { polls: 0 };
    let attempts = 0;
    server.use(
      http.get(apiUrl(invoicePath), () => jsonResponse(view())),
      ...uploadHandlers(seen),
      http.put(apiUrl(invoicePath), () => {
        attempts += 1;
        return attempts === 1 ? HttpResponse.error() : jsonResponse(uploaded);
      }),
    );
    const { user, panel } = await open();

    await user.upload(
      within(panel).getByLabelText("Archivo de la factura"),
      pdf(),
    );

    expect(
      await within(panel).findByText(
        "No pudimos subir la factura. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeVisible();
    await user.click(within(panel).getByRole("button", { name: "Reintentar" }));
    expect(await within(panel).findByText("factura-000123.pdf")).toBeVisible();
  });

  it("asks before removing the invoice and returns the payment to Por emitir", async () => {
    let removed = false;
    server.use(
      http.get(apiUrl(invoicePath), () =>
        jsonResponse(removed ? view() : uploaded),
      ),
      http.delete(apiUrl(invoicePath), () => {
        removed = true;
        return jsonResponse(view());
      }),
    );
    const { user, panel } = await open();

    await user.click(
      await within(panel).findByRole("button", { name: "Quitar factura" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Quitar la factura?",
    });
    expect(
      within(dialog).getByText(/Mariana dejará de verla en Mis facturas/),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Quitar factura" }),
    );

    await waitFor(() => expect(removed).toBe(true));
    expect(await within(panel).findByText("Por emitir")).toBeVisible();
  });

  it("names the conflict when the payment can no longer take an invoice", async () => {
    server.use(
      http.get(apiUrl(invoicePath), () => jsonResponse(view())),
      ...uploadHandlers({ polls: 0 }),
      http.put(apiUrl(invoicePath), () =>
        problemResponse(409, "payment_voided"),
      ),
    );
    const { user, panel } = await open();

    await user.upload(
      within(panel).getByLabelText("Archivo de la factura"),
      pdf(),
    );

    expect(
      await within(panel).findByText(
        "Este pago fue anulado y ya no recibe factura.",
      ),
    ).toBeVisible();
  });
});
