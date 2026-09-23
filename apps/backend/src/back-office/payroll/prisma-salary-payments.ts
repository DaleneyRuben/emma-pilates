import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  BackOfficeError,
  requireAdministrator,
  type BackOfficeActor,
} from '../back-office-errors';
import { civilText, recordBackOfficeAudit } from '../prisma-audit';
import { runIdempotent } from '../prisma-idempotency';

type Transaction = Prisma.TransactionClient;

export type SalaryPaymentInput = {
  staffMemberId: string;
  amountCentavos: number;
  paidOn: Date;
};

const paymentSelect = {
  id: true,
  staffMemberId: true,
  amountCentavos: true,
  paidOn: true,
  staffMember: { select: { name: true } },
} satisfies Prisma.SalaryPaymentSelect;

type PaymentRow = Prisma.SalaryPaymentGetPayload<{
  select: typeof paymentSelect;
}>;

const toPaymentView = ({ staffMember, ...payment }: PaymentRow) => ({
  ...payment,
  staffMemberName: staffMember.name,
});

// BKO-002: studio-wide Salary Payments for AW11 and AW12. How the amount was
// arrived at stays outside the system (Back Office glossary).
export const createPrismaSalaryPayments = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  // Amounts are positive centavos and dates are Bolivia civil dates no later
  // than today (BKO-001 D12, Q2).
  const requireValues = (input: SalaryPaymentInput) => {
    if (!Number.isInteger(input.amountCentavos) || input.amountCentavos < 1) {
      throw new BackOfficeError('invalid_back_office_value');
    }
    if (input.paidOn > boliviaDate(dependencies.now())) {
      throw new BackOfficeError('date_in_future');
    }
  };

  // Read-only dependency on booking.staff_members (ADR-0011). Any Role counts,
  // including a deactivated Staff Member's final payment (BKO-001 D10).
  const requireStaffMember = async (
    transaction: Transaction,
    staffMemberId: string,
  ) => {
    const staffMember = await transaction.staffMember.findUnique({
      where: { id: staffMemberId },
      select: { id: true },
    });
    if (staffMember === null) {
      throw new BackOfficeError('staff_member_not_found');
    }
  };

  const audit = (
    transaction: Transaction,
    actor: BackOfficeActor,
    record: {
      actionCode: 'salary_payment.recorded' | 'salary_payment.updated';
      salaryPaymentId: string;
      metadata: Prisma.InputJsonObject;
    },
  ) =>
    recordBackOfficeAudit(transaction, actor, {
      actionCode: record.actionCode,
      targetType: 'salary_payment',
      targetId: record.salaryPaymentId,
      branchId: null,
      metadata: record.metadata,
      occurredAt: dependencies.now(),
    });

  return {
    listSalaryPayments: async (
      query: {
        staffMemberId?: string;
        from?: Date;
        to?: Date;
        page: number;
        pageSize: number;
      },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const where: Prisma.SalaryPaymentWhereInput = {
        ...(query.staffMemberId === undefined
          ? {}
          : { staffMemberId: query.staffMemberId }),
        paidOn: {
          ...(query.from === undefined ? {} : { gte: query.from }),
          ...(query.to === undefined ? {} : { lte: query.to }),
        },
      };
      const [rows, totalItems] = await Promise.all([
        prisma.salaryPayment.findMany({
          where,
          orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: paymentSelect,
        }),
        prisma.salaryPayment.count({ where }),
      ]);
      return {
        items: rows.map(toPaymentView),
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
      };
    },

    recordSalaryPayment: async (
      input: SalaryPaymentInput,
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ) => {
      const actor = requireAdministrator(principal);
      requireValues(input);
      const response = await runIdempotent(
        prisma,
        {
          accountId: actor.accountId,
          command: 'record_salary_payment',
          idempotencyKey,
          request: { ...input, paidOn: civilText(input.paidOn) },
          now: dependencies.now,
        },
        async (transaction) => {
          await requireStaffMember(transaction, input.staffMemberId);
          const now = dependencies.now();
          const payment = await transaction.salaryPayment.create({
            data: {
              staffMemberId: input.staffMemberId,
              amountCentavos: input.amountCentavos,
              paidOn: input.paidOn,
              recordedByAccountId: actor.accountId,
              createdAt: now,
              updatedAt: now,
            },
            select: paymentSelect,
          });
          await audit(transaction, actor, {
            actionCode: 'salary_payment.recorded',
            salaryPaymentId: payment.id,
            metadata: {
              amountCentavos: payment.amountCentavos,
              paidOn: civilText(payment.paidOn),
            },
          });
          const view = toPaymentView(payment);
          return { ...view, paidOn: civilText(view.paidOn) };
        },
      );
      return { ...response, paidOn: new Date(`${response.paidOn}T00:00:00Z`) };
    },

    // A correction keeps the row and audits only the fields that changed.
    updateSalaryPayment: async (
      input: SalaryPaymentInput & { salaryPaymentId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      requireValues(input);
      const payment = await prisma.$transaction(async (transaction) => {
        const previous = await transaction.salaryPayment.findUnique({
          where: { id: input.salaryPaymentId },
          select: paymentSelect,
        });
        if (previous === null) {
          throw new BackOfficeError('salary_payment_not_found');
        }
        await requireStaffMember(transaction, input.staffMemberId);
        const updated = await transaction.salaryPayment.update({
          where: { id: previous.id },
          data: {
            staffMemberId: input.staffMemberId,
            amountCentavos: input.amountCentavos,
            paidOn: input.paidOn,
            updatedAt: dependencies.now(),
          },
          select: paymentSelect,
        });
        const metadata: Record<string, string | number> = {};
        if (previous.staffMemberId !== updated.staffMemberId) {
          metadata.previousStaffMemberId = previous.staffMemberId;
          metadata.staffMemberId = updated.staffMemberId;
        }
        if (previous.amountCentavos !== updated.amountCentavos) {
          metadata.previousAmountCentavos = previous.amountCentavos;
          metadata.amountCentavos = updated.amountCentavos;
        }
        if (previous.paidOn.getTime() !== updated.paidOn.getTime()) {
          metadata.previousPaidOn = civilText(previous.paidOn);
          metadata.paidOn = civilText(updated.paidOn);
        }
        if (Object.keys(metadata).length > 0) {
          await audit(transaction, actor, {
            actionCode: 'salary_payment.updated',
            salaryPaymentId: updated.id,
            metadata,
          });
        }
        return updated;
      });
      return toPaymentView(payment);
    },
  };
};

export type SalaryPayments = ReturnType<typeof createPrismaSalaryPayments>;
