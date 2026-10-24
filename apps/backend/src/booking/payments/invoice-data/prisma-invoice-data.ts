import {
  AuditActorKind,
  AuditOutcome,
  type PrismaClient,
} from '../../../generated/prisma/client';
import { auditActorOf } from '../../../system-identity/authentication/audit-actor';
import {
  InvoiceDataError,
  type InvoiceDataGateway,
  type InvoiceIssuedView,
} from './invoice-data';

type LockedPayment = {
  method: 'transfer' | 'cash' | 'credit_only';
  state: string;
  has_invoice_data: boolean;
  invoice_issued_at: Date | null;
};

const issuedView = (
  paymentId: string,
  issued: { invoiceIssuedAt: Date | null; issuedByName: string | null },
): InvoiceIssuedView => ({
  paymentId,
  invoiceIssued:
    issued.invoiceIssuedAt === null
      ? null
      : {
          issuedAt: issued.invoiceIssuedAt,
          issuedByName: issued.issuedByName ?? '',
        },
});

// PAY-007: the Invoice Data adapter. The mark is set or cleared on a locked
// Payment row with its audit record in the same transaction; a repeated mark
// or unmark changes nothing and records nothing.
export const createPrismaInvoiceData = (
  prisma: PrismaClient,
): InvoiceDataGateway => ({
  lastFor: async (clientId) => {
    const latest = await prisma.payment.findFirst({
      where: { clientId, invoiceTaxId: { not: null } },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: { invoiceTaxId: true, invoiceName: true },
    });
    return latest?.invoiceTaxId == null || latest.invoiceName === null
      ? null
      : { taxId: latest.invoiceTaxId, name: latest.invoiceName };
  },

  setIssued: ({ paymentId, issued, principal, now }) =>
    prisma.$transaction(async (transaction) => {
      const [payment] = await transaction.$queryRaw<LockedPayment[]>`
        SELECT method::text AS method, state::text AS state,
          invoice_tax_id IS NOT NULL AS has_invoice_data, invoice_issued_at
        FROM booking.payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
      if (payment === undefined)
        throw new InvoiceDataError('payment_not_found');
      if (payment.state !== 'confirmed') {
        throw new InvoiceDataError('payment_not_confirmed');
      }

      const actor = auditActorOf(principal);
      if (issued === (payment.invoice_issued_at !== null)) {
        const current = await transaction.payment.findUniqueOrThrow({
          where: { id: paymentId },
          select: {
            invoiceIssuedAt: true,
            invoiceIssuedByAccount: {
              select: { staffMember: { select: { name: true } } },
            },
          },
        });
        return issuedView(paymentId, {
          invoiceIssuedAt: current.invoiceIssuedAt,
          issuedByName:
            current.invoiceIssuedByAccount?.staffMember?.name ?? null,
        });
      }

      await transaction.payment.update({
        where: { id: paymentId },
        data: issued
          ? { invoiceIssuedAt: now, invoiceIssuedByAccountId: actor.accountId }
          : { invoiceIssuedAt: null, invoiceIssuedByAccountId: null },
      });
      await transaction.auditRecord.create({
        data: {
          actionCode: issued
            ? 'payment.invoice_issued_marked'
            : 'payment.invoice_issued_unmarked',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.ACCOUNT,
          actorAccountId: actor.accountId,
          actorRole: actor.role,
          impersonationId: actor.impersonationId,
          targetType: 'payment',
          targetId: paymentId,
          correlationId: paymentId,
          occurredAt: now,
          metadata: {
            method: payment.method,
            hasInvoiceData: payment.has_invoice_data,
            ...(issued
              ? {}
              : { previousIssuedAt: payment.invoice_issued_at?.toISOString() }),
          },
        },
      });
      if (!issued)
        return issuedView(paymentId, {
          invoiceIssuedAt: null,
          issuedByName: null,
        });

      const author = await transaction.account.findUniqueOrThrow({
        where: { id: actor.accountId },
        select: { staffMember: { select: { name: true } } },
      });
      return issuedView(paymentId, {
        invoiceIssuedAt: now,
        issuedByName: author.staffMember?.name ?? null,
      });
    }),
});
