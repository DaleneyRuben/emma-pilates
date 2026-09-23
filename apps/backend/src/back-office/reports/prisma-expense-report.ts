import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { requireAdministrator } from '../back-office-errors';

const monthOf = (civilDate: Date) =>
  `${civilDate.toISOString().slice(0, 7)}-01`;

// BKO-002: the expense half of AW16. The range is the same pair of instants as
// ADM-001's income report, read as the Bolivia civil dates [from, until).
// Salary Payments are studio-wide and count only when no Branch is selected
// (CONTEXT-MAP, BKO-001 Q3).
export const createPrismaExpenseReport = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  expenseReport: async (
    query: { from: Date; until: Date; branchId?: string },
    principal: AuthenticatedPrincipal,
  ) => {
    requireAdministrator(principal);
    const dates = {
      gte: boliviaDate(query.from),
      lt: boliviaDate(query.until),
    };
    const [expenses, salaryPayments] = await Promise.all([
      prisma.expense.findMany({
        where: {
          incurredOn: dates,
          ...(query.branchId === undefined ? {} : { branchId: query.branchId }),
        },
        select: {
          amountCentavos: true,
          incurredOn: true,
          expenseCategory: { select: { id: true, name: true } },
        },
      }),
      query.branchId === undefined
        ? prisma.salaryPayment.findMany({
            where: { paidOn: dates },
            select: { amountCentavos: true, paidOn: true },
          })
        : Promise.resolve([]),
    ]);

    const categories = new Map<
      string,
      {
        expenseCategoryId: string;
        expenseCategoryName: string;
        totalCentavos: number;
      }
    >();
    const months = new Map<string, number>();
    const addToMonth = (civilDate: Date, amount: number) => {
      const month = monthOf(civilDate);
      months.set(month, (months.get(month) ?? 0) + amount);
    };
    let expensesCentavos = 0;
    for (const expense of expenses) {
      expensesCentavos += expense.amountCentavos;
      addToMonth(expense.incurredOn, expense.amountCentavos);
      const category = categories.get(expense.expenseCategory.id) ?? {
        expenseCategoryId: expense.expenseCategory.id,
        expenseCategoryName: expense.expenseCategory.name,
        totalCentavos: 0,
      };
      category.totalCentavos += expense.amountCentavos;
      categories.set(category.expenseCategoryId, category);
    }
    let salaryPaymentsCentavos = 0;
    for (const payment of salaryPayments) {
      salaryPaymentsCentavos += payment.amountCentavos;
      addToMonth(payment.paidOn, payment.amountCentavos);
    }

    return {
      from: query.from,
      until: query.until,
      branchId: query.branchId ?? null,
      totalCentavos: expensesCentavos + salaryPaymentsCentavos,
      expensesCentavos,
      salaryPaymentsCentavos,
      byCategory: [...categories.values()].sort(
        (left, right) =>
          right.totalCentavos - left.totalCentavos ||
          left.expenseCategoryName.localeCompare(
            right.expenseCategoryName,
            'es',
          ),
      ),
      months: [...months.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, totalCentavos]) => ({ month, totalCentavos })),
      generatedAt: dependencies.now(),
    };
  },
});

export type ExpenseReport = ReturnType<typeof createPrismaExpenseReport>;
