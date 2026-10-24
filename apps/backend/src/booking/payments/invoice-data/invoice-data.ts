import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import { requireAdministrator } from '../../administration/administration-errors';
import { BookingAccessDeniedError } from '../../commands/create-booking';

// PAY-007 (booking ADR-0012): the tax identity a Client wants on her invoice.
// Invoices are issued outside the system; a sale carries both fields or
// neither («Sin factura»), and the Administrator marks «Factura emitida».
export type InvoiceData = { taxId: string; name: string };

export type InvoiceIssuedView = {
  paymentId: string;
  invoiceIssued: { issuedAt: Date; issuedByName: string } | null;
};

export type InvoiceDataGateway = {
  /** The Invoice Data of the Client's latest sale that carried any. */
  lastFor: (clientId: string) => Promise<InvoiceData | null>;
  setIssued: (input: {
    paymentId: string;
    issued: boolean;
    principal: AuthenticatedPrincipal;
    now: Date;
  }) => Promise<InvoiceIssuedView>;
};

export type InvoiceDataErrorCode =
  'payment_not_found' | 'payment_not_confirmed';

const statuses: Record<InvoiceDataErrorCode, number> = {
  payment_not_found: 404,
  payment_not_confirmed: 409,
};

export class InvoiceDataError extends Error {
  readonly status: number;

  constructor(readonly code: InvoiceDataErrorCode) {
    super(code);
    this.name = 'InvoiceDataError';
    this.status = statuses[code];
  }
}

export const invoiceTaxIdMaxLength = 20;
export const invoiceNameMaxLength = 120;

// A Bolivian NIT is digits; a CI may carry a complement («4567891-1A»).
const taxIdPattern = /^(?=.*\d)[0-9A-Z-]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const normalizeInvoiceData = (
  value: unknown,
): InvoiceData | null | 'invalid' => {
  if (value === null || value === undefined) return null;
  if (
    !isRecord(value) ||
    typeof value.taxId !== 'string' ||
    typeof value.name !== 'string'
  ) {
    return 'invalid';
  }
  const taxId = value.taxId.replace(/\s+/g, '').toUpperCase();
  const name = value.name.trim().replace(/\s+/g, ' ');
  if (
    taxId.length > invoiceTaxIdMaxLength ||
    !taxIdPattern.test(taxId) ||
    name.length === 0 ||
    name.length > invoiceNameMaxLength
  ) {
    return 'invalid';
  }
  return { taxId, name };
};

/** The Payment columns a sale writes; «Sin factura» leaves both empty. */
export const invoiceColumns = (invoiceData?: InvoiceData | null) => ({
  invoiceTaxId: invoiceData?.taxId ?? null,
  invoiceName: invoiceData?.name ?? null,
});

export const readClientLastInvoiceData = async (
  principal: AuthenticatedPrincipal,
  { gateway }: { gateway: InvoiceDataGateway },
): Promise<InvoiceData | null> => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return gateway.lastFor(principal.identity.clientId);
};

// Assistants act for any Client at the front desk (the cash sale's rule).
export const readAssistantLastInvoiceData = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  { gateway }: { gateway: InvoiceDataGateway },
): Promise<InvoiceData | null> => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'assistant' &&
      principal.identity.role !== 'administrator')
  ) {
    throw new BookingAccessDeniedError();
  }
  return gateway.lastFor(command.clientId);
};

type MarkDependencies = { gateway: InvoiceDataGateway; now: () => Date };

const setIssued =
  (issued: boolean) =>
  async (
    command: { paymentId: string },
    principal: AuthenticatedPrincipal,
    { gateway, now }: MarkDependencies,
  ): Promise<InvoiceIssuedView> => {
    requireAdministrator(principal);
    return gateway.setIssued({
      paymentId: command.paymentId,
      issued,
      principal,
      now: now(),
    });
  };

export const markInvoiceIssued = setIssued(true);
export const unmarkInvoiceIssued = setIssued(false);
