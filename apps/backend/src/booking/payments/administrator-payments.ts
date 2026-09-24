import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireAdministrator } from '../administration/administration-errors';

export type AdministratorPaymentState = 'pending' | 'confirmed' | 'rejected';
export type AdministratorPaymentStatusFilter =
  AdministratorPaymentState | 'all';

// AW28 lists transfer Payments only: cash and Credit-only Payments are
// confirmed when they are recorded, so there is nothing to review (ADR-0006).
export type AdministratorPaymentRow = {
  id: string;
  clientId: string;
  clientName: string;
  planName: string;
  planPriceCentavos: number;
  creditAppliedCentavos: number;
  /** The Plan price less the Credit applied: what the Client transferred. */
  amountDueCentavos: number;
  state: AdministratorPaymentState;
  submittedAt: Date;
  decidedAt: Date | null;
  receiptAvailable: boolean;
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
    ...(query === '' ? {} : { query }),
  });
};
