import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  BackOfficeError,
  databaseCause,
  requireAdministrator,
  type BackOfficeActor,
} from '../back-office-errors';
import { civilText, recordBackOfficeAudit } from '../prisma-audit';
import { runIdempotent } from '../prisma-idempotency';

type Transaction = Prisma.TransactionClient;

export type ExpenseInput = {
  branchId: string;
  expenseCategoryId: string;
  amountCentavos: number;
  incurredOn: Date;
};
export type ExpenseChange = Omit<ExpenseInput, 'branchId'> & {
  expenseId: string;
};

const expenseSelect = {
  id: true,
  branchId: true,
  expenseCategoryId: true,
  amountCentavos: true,
  incurredOn: true,
  expenseCategory: { select: { name: true } },
} satisfies Prisma.ExpenseSelect;

type ExpenseRow = Prisma.ExpenseGetPayload<{ select: typeof expenseSelect }>;

const toExpenseView = ({ expenseCategory, ...expense }: ExpenseRow) => ({
  ...expense,
  expenseCategoryName: expenseCategory.name,
});

const translate = (error: unknown): never => {
  if (error instanceof BackOfficeError) throw error;
  const cause = databaseCause(error);
  if (cause.includes('expense_categories_normalized_name_key')) {
    throw new BackOfficeError('expense_category_name_taken');
  }
  if (cause.includes('expenses_expense_category_id_fkey')) {
    throw new BackOfficeError('expense_category_in_use');
  }
  if (cause.includes('violates check constraint') || cause.includes('23514')) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  throw error;
};

// BKO-002: Expense Categories (AW15) and Branch Expenses (AW13, AW14).
export const createPrismaExpenses = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const requireValues = (input: Omit<ExpenseChange, 'expenseId'>) => {
    if (!Number.isInteger(input.amountCentavos) || input.amountCentavos < 1) {
      throw new BackOfficeError('invalid_back_office_value');
    }
    if (input.incurredOn > boliviaDate(dependencies.now())) {
      throw new BackOfficeError('date_in_future');
    }
  };

  // Read-only dependency on booking.branches (ADR-0011).
  const requireActiveBranch = async (
    transaction: Transaction,
    branchId: string,
  ) => {
    const branch = await transaction.branch.findUnique({
      where: { id: branchId },
      select: { archivedAt: true },
    });
    if (branch === null) throw new BackOfficeError('branch_not_found');
    if (branch.archivedAt !== null) {
      throw new BackOfficeError('branch_archived');
    }
  };

  const requireCategory = async (
    transaction: Transaction,
    expenseCategoryId: string,
  ) => {
    const category = await transaction.expenseCategory.findUnique({
      where: { id: expenseCategoryId },
      select: { id: true },
    });
    if (category === null) {
      throw new BackOfficeError('expense_category_not_found');
    }
  };

  const audit = (
    transaction: Transaction,
    actor: BackOfficeActor,
    record: {
      actionCode: 'expense.recorded' | 'expense.updated';
      expense: { id: string; branchId: string };
      metadata: Prisma.InputJsonObject;
    },
  ) =>
    recordBackOfficeAudit(transaction, actor, {
      actionCode: record.actionCode,
      targetType: 'expense',
      targetId: record.expense.id,
      branchId: record.expense.branchId,
      metadata: record.metadata,
      occurredAt: dependencies.now(),
    });

  return {
    listExpenseCategories: async (principal: AuthenticatedPrincipal) => {
      requireAdministrator(principal);
      const categories = await prisma.expenseCategory.findMany({
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          _count: { select: { expenses: true } },
        },
      });
      return categories.map(({ _count, ...category }) => ({
        ...category,
        inUse: _count.expenses > 0,
      }));
    },

    createExpenseCategory: async (
      input: { name: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const name = input.name.trim();
      if (name === '') throw new BackOfficeError('invalid_back_office_value');
      const now = dependencies.now();
      const category = await prisma.expenseCategory
        .create({
          data: { name, createdAt: now, updatedAt: now },
          select: { id: true, name: true },
        })
        .catch(translate);
      return { ...category, inUse: false };
    },

    // A label is deleted outright; the restrictive key refuses a used one.
    deleteExpenseCategory: async (
      input: { expenseCategoryId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const deleted = await prisma.expenseCategory
        .deleteMany({ where: { id: input.expenseCategoryId } })
        .catch(translate);
      if (deleted.count === 0) {
        throw new BackOfficeError('expense_category_not_found');
      }
    },

    listExpenses: async (
      query: {
        branchId: string;
        expenseCategoryId?: string;
        from?: Date;
        to?: Date;
        page: number;
        pageSize: number;
      },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const where: Prisma.ExpenseWhereInput = {
        branchId: query.branchId,
        ...(query.expenseCategoryId === undefined
          ? {}
          : { expenseCategoryId: query.expenseCategoryId }),
        incurredOn: {
          ...(query.from === undefined ? {} : { gte: query.from }),
          ...(query.to === undefined ? {} : { lte: query.to }),
        },
      };
      const [rows, totalItems] = await Promise.all([
        prisma.expense.findMany({
          where,
          orderBy: [
            { incurredOn: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: expenseSelect,
        }),
        prisma.expense.count({ where }),
      ]);
      return {
        items: rows.map(toExpenseView),
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
      };
    },

    recordExpense: async (
      input: ExpenseInput,
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ) => {
      const actor = requireAdministrator(principal);
      requireValues(input);
      const response = await runIdempotent(
        prisma,
        {
          accountId: actor.accountId,
          command: 'record_expense',
          idempotencyKey,
          request: { ...input, incurredOn: civilText(input.incurredOn) },
          now: dependencies.now,
        },
        async (transaction) => {
          await requireActiveBranch(transaction, input.branchId);
          await requireCategory(transaction, input.expenseCategoryId);
          const now = dependencies.now();
          const expense = await transaction.expense.create({
            data: {
              branchId: input.branchId,
              expenseCategoryId: input.expenseCategoryId,
              amountCentavos: input.amountCentavos,
              incurredOn: input.incurredOn,
              recordedByAccountId: actor.accountId,
              createdAt: now,
              updatedAt: now,
            },
            select: expenseSelect,
          });
          await audit(transaction, actor, {
            actionCode: 'expense.recorded',
            expense,
            metadata: {
              amountCentavos: expense.amountCentavos,
              incurredOn: civilText(expense.incurredOn),
              expenseCategoryId: expense.expenseCategoryId,
            },
          });
          const view = toExpenseView(expense);
          return { ...view, incurredOn: civilText(view.incurredOn) };
        },
      ).catch(translate);
      return {
        ...response,
        incurredOn: new Date(`${response.incurredOn}T00:00:00Z`),
      };
    },

    // The Branch never changes (BKO-001 D11); only changed fields are audited.
    updateExpense: async (
      input: ExpenseChange,
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      requireValues(input);
      const expense = await prisma
        .$transaction(async (transaction) => {
          const previous = await transaction.expense.findUnique({
            where: { id: input.expenseId },
            select: expenseSelect,
          });
          if (previous === null) {
            throw new BackOfficeError('expense_not_found');
          }
          await requireCategory(transaction, input.expenseCategoryId);
          const updated = await transaction.expense.update({
            where: { id: previous.id },
            data: {
              expenseCategoryId: input.expenseCategoryId,
              amountCentavos: input.amountCentavos,
              incurredOn: input.incurredOn,
              updatedAt: dependencies.now(),
            },
            select: expenseSelect,
          });
          const metadata: Record<string, string | number> = {};
          if (previous.expenseCategoryId !== updated.expenseCategoryId) {
            metadata.previousExpenseCategoryId = previous.expenseCategoryId;
            metadata.expenseCategoryId = updated.expenseCategoryId;
          }
          if (previous.amountCentavos !== updated.amountCentavos) {
            metadata.previousAmountCentavos = previous.amountCentavos;
            metadata.amountCentavos = updated.amountCentavos;
          }
          if (previous.incurredOn.getTime() !== updated.incurredOn.getTime()) {
            metadata.previousIncurredOn = civilText(previous.incurredOn);
            metadata.incurredOn = civilText(updated.incurredOn);
          }
          if (Object.keys(metadata).length > 0) {
            await audit(transaction, actor, {
              actionCode: 'expense.updated',
              expense: updated,
              metadata,
            });
          }
          return updated;
        })
        .catch(translate);
      return toExpenseView(expense);
    },
  };
};

export type Expenses = ReturnType<typeof createPrismaExpenses>;
