import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../../commands/create-booking';
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
  }) => Promise<StaffInvoiceView>;
  remove: (input: {
    paymentId: string;
    principal: AuthenticatedPrincipal;
    now: Date;
  }) => Promise<StaffInvoiceView>;
  read: (paymentId: string) => Promise<StaffInvoiceView>;
  listForStaff: (filter: StaffInvoiceFilter) => Promise<StaffInvoiceView[]>;
  listForClient: (clientId: string) => Promise<ClientInvoiceView[]>;
  readFileForStaff: (paymentId: string) => Promise<InvoiceFileObject>;
  readFileForClient: (input: {
    paymentId: string;
    clientId: string;
  }) => Promise<InvoiceFileObject>;
};

export type InvoiceFileErrorCode =
  | 'payment_not_found'
  | 'payment_not_confirmed'
  | 'payment_voided'
  | 'payment_without_invoice_data'
  | 'invoice_file_not_attachable'
  | 'invoice_not_found';

const statuses: Record<InvoiceFileErrorCode, number> = {
  payment_not_found: 404,
  payment_not_confirmed: 409,
  payment_voided: 409,
  payment_without_invoice_data: 409,
  invoice_file_not_attachable: 409,
  invoice_not_found: 404,
};

export class InvoiceFileError extends Error {
  readonly status: number;

  constructor(readonly code: InvoiceFileErrorCode) {
    super(code);
    this.name = 'InvoiceFileError';
    this.status = statuses[code];
  }
}

export const invoiceFileNameMaxLength = 120;

const extensionOf: Record<InvoiceMediaType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// What the staff app or the browser called the file, made safe to show and
// to send back in a Content-Disposition header: no folders, no control
// characters, at most 120 characters with the extension kept.
export const normalizeInvoiceFileName = (
  raw: string | undefined,
  mediaType: InvoiceMediaType,
): string => {
  const base = (raw ?? '').split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, '').trim();
  if (cleaned.length === 0) return `factura.${extensionOf[mediaType]}`;
  if (cleaned.length <= invoiceFileNameMaxLength) return cleaned;
  const dot = cleaned.lastIndexOf('.');
  const extension =
    dot > 0 && cleaned.length - dot <= 8 ? cleaned.slice(dot) : '';
  return (
    cleaned.slice(0, invoiceFileNameMaxLength - extension.length) + extension
  );
};

/**
 * FIX-044 (owner, 2026-11-05): the Administrator, the Coordinator and the
 * Assistant upload, replace and remove the issued invoice of a payment.
 */
export const handlesInvoices = (principal: AuthenticatedPrincipal): boolean =>
  principal.identity.kind === 'staff' &&
  (principal.identity.role === 'administrator' ||
    principal.identity.role === 'coordinator' ||
    principal.identity.role === 'assistant');

const requireInvoiceStaff = (principal: AuthenticatedPrincipal): void => {
  if (!handlesInvoices(principal)) throw new BookingAccessDeniedError();
};

type Dependencies = { gateway: InvoiceFileGateway; now: () => Date };

export const attachPaymentInvoice = async (
  command: { paymentId: string; imageAssetId: string; fileName: string },
  principal: AuthenticatedPrincipal,
  { gateway, now }: Dependencies,
): Promise<StaffInvoiceView> => {
  requireInvoiceStaff(principal);
  return gateway.attach({ ...command, principal, now: now() });
};

export const removePaymentInvoice = async (
  command: { paymentId: string },
  principal: AuthenticatedPrincipal,
  { gateway, now }: Dependencies,
): Promise<StaffInvoiceView> => {
  requireInvoiceStaff(principal);
  return gateway.remove({ ...command, principal, now: now() });
};

export const readPaymentInvoice = async (
  command: { paymentId: string },
  principal: AuthenticatedPrincipal,
  { gateway }: { gateway: InvoiceFileGateway },
): Promise<StaffInvoiceView> => {
  requireInvoiceStaff(principal);
  return gateway.read(command.paymentId);
};

export const readPaymentInvoiceFile = async (
  command: { paymentId: string },
  principal: AuthenticatedPrincipal,
  { gateway }: { gateway: InvoiceFileGateway },
): Promise<InvoiceFileObject> => {
  requireInvoiceStaff(principal);
  return gateway.readFileForStaff(command.paymentId);
};

export const listStaffInvoices = async (
  command: { filter: StaffInvoiceFilter },
  principal: AuthenticatedPrincipal,
  { gateway }: { gateway: InvoiceFileGateway },
): Promise<StaffInvoiceView[]> => {
  requireInvoiceStaff(principal);
  return gateway.listForStaff(command.filter);
};

const requireClient = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.clientId;
};

export const listClientInvoices = async (
  principal: AuthenticatedPrincipal,
  { gateway }: { gateway: InvoiceFileGateway },
): Promise<ClientInvoiceView[]> =>
  gateway.listForClient(requireClient(principal));

export const readClientInvoiceFile = async (
  command: { paymentId: string },
  principal: AuthenticatedPrincipal,
  { gateway }: { gateway: InvoiceFileGateway },
): Promise<InvoiceFileObject> =>
  gateway.readFileForClient({
    paymentId: command.paymentId,
    clientId: requireClient(principal),
  });
