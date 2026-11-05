import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import type { InvoiceData } from '../invoice-data/invoice-data';

export type InvoiceMediaType = 'application/pdf' | 'image/jpeg' | 'image/png';

export type InvoiceFileView = {
  fileName: string;
  mediaType: InvoiceMediaType;
  byteSize: number;
  uploadedAt: Date;
  uploadedByName: string;
};

export type StaffInvoiceView = {
  paymentId: string;
  clientId: string;
  clientName: string;
  purchaseLabel: string;
  amountDueCentavos: number;
  method: 'transfer' | 'cash' | 'credit_only';
  confirmedAt: Date | null;
  voided: boolean;
  invoiceData: InvoiceData | null;
  invoiceIssued: { issuedAt: Date; issuedByName: string } | null;
  file: InvoiceFileView | null;
};

export type ClientInvoiceView = {
  paymentId: string;
  purchaseLabel: string;
  amountDueCentavos: number;
  paidAt: Date;
  state: 'ready' | 'preparing';
  voided: boolean;
  invoiceData: InvoiceData;
  file: Omit<InvoiceFileView, 'uploadedByName'> | null;
};

export type InvoiceFileObject = {
  objectKey: string;
  mediaType: InvoiceMediaType;
  fileName: string;
};

export type StaffInvoiceFilter = 'pending' | 'uploaded';

export type InvoiceFileGateway = {
  attach: (input: {
    paymentId: string;
    imageAssetId: string;
    fileName: string;
    principal: AuthenticatedPrincipal;
    now: Date;
  }) => Promise<StaffInvoiceView | { paymentId: string }>;
  remove: (input: {
    paymentId: string;
    principal: AuthenticatedPrincipal;
    now: Date;
  }) => Promise<StaffInvoiceView | { paymentId: string }>;
  read: (paymentId: string) => Promise<StaffInvoiceView>;
  listForStaff: (filter: StaffInvoiceFilter) => Promise<StaffInvoiceView[]>;
  listForClient: (clientId: string) => Promise<ClientInvoiceView[]>;
  readFileForStaff: (paymentId: string) => Promise<InvoiceFileObject>;
  readFileForClient: (input: {
    paymentId: string;
    clientId: string;
  }) => Promise<InvoiceFileObject>;
};

export const invoiceFileNameMaxLength = 120;

const notImplemented = (): never => {
  throw new Error('not implemented');
};

export const normalizeInvoiceFileName: (
  raw: string | undefined,
  mediaType: InvoiceMediaType,
) => string = notImplemented;

type Dependencies = { gateway: InvoiceFileGateway; now: () => Date };

export const attachPaymentInvoice: (
  command: { paymentId: string; imageAssetId: string; fileName: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<unknown> = notImplemented;

export const removePaymentInvoice: (
  command: { paymentId: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<unknown> = notImplemented;

export const listStaffInvoices: (
  command: { filter: StaffInvoiceFilter },
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: InvoiceFileGateway },
) => Promise<StaffInvoiceView[]> = notImplemented;

export const listClientInvoices: (
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: InvoiceFileGateway },
) => Promise<ClientInvoiceView[]> = notImplemented;
