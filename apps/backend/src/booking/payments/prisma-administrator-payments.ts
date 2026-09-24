import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import { containsPattern } from '../search-pattern';
import type {
  AdministratorPaymentLedger,
  AdministratorPaymentRow,
  AdministratorPaymentState,
  AdministratorPaymentStatusFilter,
} from './administrator-payments';

type PaymentRow = {
  id: string;
  client_id: string;
  client_name: string;
  plan_name: string;
  plan_price_centavos: number;
  credit_applied_centavos: number;
  amount_due_centavos: number;
  state: AdministratorPaymentState;
  submitted_at: Date;
  decided_at: Date | null;
  receipt_available: boolean;
};

const stateCondition = (status: AdministratorPaymentStatusFilter) =>
  status === 'all' ? Prisma.empty : Prisma.sql`AND p.state::text = ${status}`;

// STAFF-004's accent- and case-insensitive match on the Client's name.
const searchCondition = (query: string | undefined) =>
  query === undefined
    ? Prisma.empty
    : Prisma.sql`AND booking.search_text(c.name) LIKE booking.search_text(${containsPattern(query)})`;

// A receipt is shown while its image is retained (ADR-0075), the same rule as
// the review's `receiptOf`.
const toRow = (row: PaymentRow): AdministratorPaymentRow => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name,
  planName: row.plan_name,
  planPriceCentavos: row.plan_price_centavos,
  creditAppliedCentavos: row.credit_applied_centavos,
  amountDueCentavos: row.amount_due_centavos,
  state: row.state,
  submittedAt: row.submitted_at,
  decidedAt: row.decided_at,
  receiptAvailable: row.receipt_available,
});

// WEB-005 (AW28): every transfer Payment of the studio, page by page
// (ADR-0061) with a state filter and a Client search (ADR-0062). Pending
// transfers come first, oldest first, as the Staff app's queue orders them;
// decided ones follow, newest decision first.
export const createPrismaAdministratorPayments = (
  prisma: PrismaClient,
): AdministratorPaymentLedger => ({
  list: async ({ page, pageSize, status, query }) => {
    const where = Prisma.sql`WHERE p.method = 'transfer'
      ${stateCondition(status)} ${searchCondition(query)}`;
    const [rows, [counted], pendingCount] = await Promise.all([
      prisma.$queryRaw<PaymentRow[]>`
        SELECT p.id, p.client_id, c.name AS client_name,
          p.plan_name_snapshot AS plan_name, p.plan_price_centavos,
          p.credit_applied_centavos, p.amount_due_centavos,
          p.state::text AS state, p.submitted_at, p.decided_at,
          (receipt.id IS NOT NULL AND receipt.deleted_at IS NULL)
            AS receipt_available
        FROM booking.payments p
        JOIN booking.clients c ON c.id = p.client_id
        LEFT JOIN booking.purchase_intents intent
          ON intent.id = p.purchase_intent_id
        LEFT JOIN system.image_assets receipt
          ON receipt.id = intent.receipt_image_asset_id
        ${where}
        ORDER BY (p.state = 'pending') DESC,
          CASE WHEN p.state = 'pending' THEN p.submitted_at END ASC,
          p.decided_at DESC NULLS LAST,
          p.id
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS total
        FROM booking.payments p
        JOIN booking.clients c ON c.id = p.client_id
        ${where}`,
      prisma.payment.count({
        where: { method: 'TRANSFER', state: 'PENDING' },
      }),
    ]);

    return {
      items: rows.map(toRow),
      page,
      pageSize,
      totalItems: Number(counted?.total ?? 0),
      pendingCount,
    };
  },
});
