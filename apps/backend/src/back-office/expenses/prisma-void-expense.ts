import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError, requireAdministrator } from '../back-office-errors';
import { recordBackOfficeAudit } from '../prisma-audit';
import { expenseSelect, toExpenseView } from './prisma-expenses';

const maximumReasonLength = 300;

// Finding 104 (owner, 2026-11-18): «eliminar» an Expense voids it, never a
// DELETE (ADR-0086). It keeps who, when, and an optional reason, stays in
// Gastos, and counts for nothing in the reports.
export const createPrismaVoidExpense = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  voidExpense: async (
    input: { expenseId: string; reason?: string },
    principal: AuthenticatedPrincipal,
  ) => {
    const actor = requireAdministrator(principal);
    const reason = input.reason?.trim();
    if (
      reason !== undefined &&
      (reason === '' || reason.length > maximumReasonLength)
    ) {
      throw new BackOfficeError('invalid_back_office_value');
    }
    const expense = await prisma.$transaction(async (transaction) => {
      const previous = await transaction.expense.findUnique({
        where: { id: input.expenseId },
        select: {
          id: true,
          branchId: true,
          amountCentavos: true,
          voidedAt: true,
        },
      });
      if (previous === null) throw new BackOfficeError('expense_not_found');
      if (previous.voidedAt !== null) {
        throw new BackOfficeError('expense_voided');
      }
      const now = dependencies.now();
      // Conditional, so two concurrent voids never both succeed.
      const { count } = await transaction.expense.updateMany({
        where: { id: previous.id, voidedAt: null },
        data: {
          voidedAt: now,
          voidedByAccountId: actor.accountId,
          voidReason: reason ?? null,
          updatedAt: now,
        },
      });
      if (count === 0) throw new BackOfficeError('expense_voided');
      await recordBackOfficeAudit(transaction, actor, {
        actionCode: 'expense.voided',
        targetType: 'expense',
        targetId: previous.id,
        branchId: previous.branchId,
        metadata: {
          amountCentavos: previous.amountCentavos,
          ...(reason === undefined ? {} : { reason }),
        },
        occurredAt: now,
      });
      return transaction.expense.findUniqueOrThrow({
        where: { id: previous.id },
        select: expenseSelect,
      });
    });
    return toExpenseView(expense);
  },
});

export type VoidExpense = ReturnType<typeof createPrismaVoidExpense>;
