import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireAdministrator } from '../administration/administration-errors';
import type {
  InvoiceData,
  InvoiceIssuedView,
} from './invoice-data/invoice-data';

export type AdministratorPaymentState =
  'pending' | 'confirmed' | 'rejected' | 'voided';
export type AdministratorPaymentStatusFilter =
  AdministratorPaymentState | 'all';

/** `unissued`: confirmed sales with Invoice Data and no «Factura emitida». */
export type AdministratorPaymentInvoiceFilter = 'all' | 'unissued';

// AW28 lists the transfers to review and, since PAY-007, the cash sales the
// accountant invoices too; Credit-only Payments carry no money (ADR-0006).
export type AdministratorPaymentRow = {
  id: string;
  clientId: string;
  clientName: string;
  planName: string;
  method: 'transfer' | 'cash';
  planPriceCentavos: number;
  creditAppliedCentavos: number;
  /** The Plan price less the Credit applied: what the Client paid. */
  amountDueCentavos: number;
  state: AdministratorPaymentState;
  submittedAt: Date;
  decidedAt: Date | null;
  receiptAvailable: boolean;
  /** Present only on a voided sale (PAY-006). */
  voidReason: string | null;
  invoiceData: InvoiceData | null;
  invoiceIssued: InvoiceIssuedView['invoiceIssued'];
};

export type AdministratorPaymentPage = {
  items: AdministratorPaymentRow[];
  page: number;
  pageSize: number;
  /** Payments matching the filters. */
  totalItems: number;
  /** Pending transfers in the whole studio, whatever the filters. */
  pendingCount: number;
};

export type AdministratorPaymentQuery = {
  page: number;
  pageSize: number;
  status: AdministratorPaymentStatusFilter;
  invoice: AdministratorPaymentInvoiceFilter;
  query?: string;
};

export interface AdministratorPaymentLedger {
  list: (input: AdministratorPaymentQuery) => Promise<AdministratorPaymentPage>;
}

// Payment and receipt data is for Administrators only (ADR-0054).
export const listAdministratorPayments = async (
  command: AdministratorPaymentQuery,
  principal: AuthenticatedPrincipal,
  { ledger }: { ledger: AdministratorPaymentLedger },
): Promise<AdministratorPaymentPage> => {
  requireAdministrator(principal);
  const query = command.query?.trim() ?? '';
  return ledger.list({
    page: command.page,
    pageSize: command.pageSize,
    status: command.status,
    invoice: command.invoice,
    ...(query === '' ? {} : { query }),
  });
};
