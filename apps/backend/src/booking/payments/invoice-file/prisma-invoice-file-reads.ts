import type { Prisma } from '../../../generated/prisma/client';
import {
  ImageVariantKind,
  ImageVariantVisibility,
  PaymentState,
} from '../../../generated/prisma/enums';
import { imageMediaTypes } from '../../../uploads/image-asset-attachments';
import { saleLabel } from '../payment-label';
import {
  InvoiceFileError,
  type ClientInvoiceView,
  type InvoiceFileObject,
  type InvoiceMediaType,
  type StaffInvoiceFilter,
  type StaffInvoiceView,
} from './invoice-file';

type Reader = Pick<Prisma.TransactionClient, 'payment' | 'paymentInvoice'>;

const staffName = {
  select: { staffMember: { select: { name: true } } },
} as const;

const currentInvoice = {
  where: { removedAt: null },
  orderBy: { uploadedAt: 'desc' },
  take: 1,
  select: {
    id: true,
    fileName: true,
    uploadedAt: true,
    uploadedByAccount: staffName,
    imageAsset: {
      select: {
        declaredMediaType: true,
        verifiedMediaType: true,
        declaredByteSize: true,
        verifiedByteSize: true,
      },
    },
  },
} satisfies Prisma.Payment$invoicesArgs;

export const invoicePaymentSelect = {
  id: true,
  clientId: true,
  client: { select: { name: true } },
  kind: true,
  planNameSnapshot: true,
  amountDueCentavos: true,
  method: true,
  state: true,
  decidedAt: true,
  submittedAt: true,
  invoiceTaxId: true,
  invoiceName: true,
  invoiceIssuedAt: true,
  invoiceIssuedByAccount: staffName,
  invoices: currentInvoice,
} satisfies Prisma.PaymentSelect;

type InvoicePaymentRow = Prisma.PaymentGetPayload<{
  select: typeof invoicePaymentSelect;
}>;

const fileOf = (row: InvoicePaymentRow) => {
  const invoice = row.invoices[0];
  if (invoice === undefined) return null;
  const asset = invoice.imageAsset;
  return {
    fileName: invoice.fileName,
    mediaType: imageMediaTypes[
      asset.verifiedMediaType ?? asset.declaredMediaType
    ] as InvoiceMediaType,
    byteSize: asset.verifiedByteSize ?? asset.declaredByteSize,
    uploadedAt: invoice.uploadedAt,
    uploadedByName: invoice.uploadedByAccount.staffMember?.name ?? '',
  };
};

const invoiceDataOf = (row: InvoicePaymentRow) =>
  row.invoiceTaxId === null || row.invoiceName === null
    ? null
    : { taxId: row.invoiceTaxId, name: row.invoiceName };

const labelOf = (row: InvoicePaymentRow): string =>
  saleLabel({
    kind: row.kind.toLowerCase(),
    planNameSnapshot: row.planNameSnapshot,
  });

export const toStaffInvoiceView = (
  row: InvoicePaymentRow,
): StaffInvoiceView => ({
  paymentId: row.id,
  clientId: row.clientId,
  clientName: row.client.name,
  purchaseLabel: labelOf(row),
  amountDueCentavos: row.amountDueCentavos,
  method: row.method.toLowerCase() as StaffInvoiceView['method'],
  confirmedAt: row.state === PaymentState.PENDING ? null : row.decidedAt,
  voided: row.state === PaymentState.VOIDED,
  invoiceData: invoiceDataOf(row),
  invoiceIssued:
    row.invoiceIssuedAt === null
      ? null
      : {
          issuedAt: row.invoiceIssuedAt,
          issuedByName: row.invoiceIssuedByAccount?.staffMember?.name ?? '',
        },
  file: fileOf(row),
});

export const readStaffInvoice = async (
  reader: Reader,
  paymentId: string,
): Promise<StaffInvoiceView> => {
  const row = await reader.payment.findUnique({
    where: { id: paymentId },
    select: invoicePaymentSelect,
  });
  if (row === null) throw new InvoiceFileError('payment_not_found');
  return toStaffInvoiceView(row);
};

const staffListSize = 100;

// E4 «Facturas»: «Por subir» is every confirmed sale whose Client asked an
// invoice and that has no file yet (an old mark without one included), oldest decision first so nothing waits
// forever; «Subidas» the latest uploads first.
export const listStaffInvoices = async (
  reader: Reader,
  filter: StaffInvoiceFilter,
): Promise<StaffInvoiceView[]> => {
  if (filter === 'pending') {
    const rows = await reader.payment.findMany({
      where: {
        state: PaymentState.CONFIRMED,
        invoiceTaxId: { not: null },
        // A mark set before FIX-044 has no file: it still waits for one.
        invoices: { none: { removedAt: null } },
      },
      orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }],
      take: staffListSize,
      select: invoicePaymentSelect,
    });
    return rows.map(toStaffInvoiceView);
  }
  const uploads = await reader.paymentInvoice.findMany({
    where: { removedAt: null },
    orderBy: [{ uploadedAt: 'desc' }, { id: 'asc' }],
    take: staffListSize,
    select: { payment: { select: invoicePaymentSelect } },
  });
  return uploads.map((upload) => toStaffInvoiceView(upload.payment));
};

// «Mis facturas»: every sale she asked an invoice for. A confirmed one with no
// file yet is «En preparación»; a voided one stays only when its invoice was
// uploaded (owner, 2026-11-05), marked «Pago anulado» by the app.
export const listClientInvoices = async (
  reader: Reader,
  clientId: string,
): Promise<ClientInvoiceView[]> => {
  const rows = await reader.payment.findMany({
    where: {
      clientId,
      invoiceTaxId: { not: null },
      OR: [
        { state: PaymentState.CONFIRMED },
        {
          state: PaymentState.VOIDED,
          invoices: { some: { removedAt: null } },
        },
      ],
    },
    orderBy: [{ decidedAt: 'desc' }, { id: 'asc' }],
    select: invoicePaymentSelect,
  });
  return rows.map((row) => {
    const file = fileOf(row);
    return {
      paymentId: row.id,
      purchaseLabel: labelOf(row),
      amountDueCentavos: row.amountDueCentavos,
      paidAt: row.decidedAt ?? row.submittedAt,
      state: file === null ? 'preparing' : 'ready',
      voided: row.state === PaymentState.VOIDED,
      invoiceData: invoiceDataOf(row)!,
      file:
        file === null
          ? null
          : {
              fileName: file.fileName,
              mediaType: file.mediaType,
              byteSize: file.byteSize,
              uploadedAt: file.uploadedAt,
            },
    };
  });
};

// A PDF is served as its kept `document`; a photo as its `readable` variant,
// like a receipt (ADR-0073).
export const readInvoiceObject = async (
  reader: Reader,
  where: { paymentId: string; clientId?: string },
): Promise<InvoiceFileObject> => {
  const invoice = await reader.paymentInvoice.findFirst({
    where: {
      paymentId: where.paymentId,
      removedAt: null,
      ...(where.clientId === undefined
        ? {}
        : { payment: { clientId: where.clientId } }),
    },
    select: {
      fileName: true,
      imageAsset: {
        select: {
          deletedAt: true,
          variants: {
            where: {
              kind: {
                in: [ImageVariantKind.DOCUMENT, ImageVariantKind.READABLE],
              },
              visibility: ImageVariantVisibility.PRIVATE,
              deleteRequestedAt: null,
              deletedAt: null,
            },
            select: { storageKey: true, mediaType: true },
            take: 1,
          },
        },
      },
    },
  });
  const variant = invoice?.imageAsset.variants[0];
  if (
    invoice === null ||
    invoice.imageAsset.deletedAt !== null ||
    variant === undefined
  ) {
    throw new InvoiceFileError('invoice_not_found');
  }
  return {
    objectKey: variant.storageKey,
    mediaType: imageMediaTypes[variant.mediaType] as InvoiceMediaType,
    fileName: invoice.fileName,
  };
};
