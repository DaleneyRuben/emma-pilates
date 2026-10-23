import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';

export type InvoiceData = { taxId: string; name: string };

export type InvoiceIssuedView = {
  paymentId: string;
  invoiceIssued: { issuedAt: Date; issuedByName: string } | null;
};

export type InvoiceDataGateway = {
  lastFor: (clientId: string) => Promise<InvoiceData | null>;
  setIssued: (input: {
    paymentId: string;
    issued: boolean;
    principal: AuthenticatedPrincipal;
    now: Date;
  }) => Promise<InvoiceIssuedView>;
};

type MarkDependencies = { gateway: InvoiceDataGateway; now: () => Date };

const notYet = (): never => {
  throw new Error('Not implemented');
};

export const normalizeInvoiceData: (
  value: unknown,
) => InvoiceData | null | 'invalid' = notYet;

export const readClientLastInvoiceData: (
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: InvoiceDataGateway },
) => Promise<InvoiceData | null> = notYet;

export const readAssistantLastInvoiceData: (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: InvoiceDataGateway },
) => Promise<InvoiceData | null> = notYet;

export const markInvoiceIssued: (
  command: { paymentId: string },
  principal: AuthenticatedPrincipal,
  dependencies: MarkDependencies,
) => Promise<InvoiceIssuedView> = notYet;

export const unmarkInvoiceIssued: (
  command: { paymentId: string },
  principal: AuthenticatedPrincipal,
  dependencies: MarkDependencies,
) => Promise<InvoiceIssuedView> = notYet;
