import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { requireAdministrator } from '../back-office-errors';
import { contingencyPercent, openingBudgetLines } from './opening-budget';
import { monthlyResult } from './monthly-result';

// Booking owns cash income, the tax rate, and the Nutritionist's cost. Back
// Office asks for them; it never reads those tables itself (ADR-0103).
export type MonthFacts = {
  taxRatePercent: number;
  cashIncomeCentavos: number;
  nutritionistCostCentavos: number;
};

const monthStart = (instant: Date) => {
  const civil = boliviaDate(instant).toISOString().slice(0, 10);
  return new Date(`${civil.slice(0, 7)}-01T00:00:00.000Z`);
};

// BKO-005: «Finanzas». Cash income, the tax from Studio Settings, the fixed
// cost budget against what was actually paid, the Nutritionist's cost, and
// the month's result. The Administrator reads it; everyone else is denied.
export const createPrismaFinance = (
  prisma: PrismaClient,
  facts: { ofMonth: (from: Date, until: Date) => Promise<MonthFacts> },
) => ({
  seedOpeningBudget: async (principal: AuthenticatedPrincipal) => {
    requireAdministrator(principal);
    const existing = await prisma.costBudgetLine.count();
    if (existing > 0) return { seeded: false };
    await prisma.costBudgetLine.createMany({
      data: openingBudgetLines.map((line, position) => ({
        id: randomUUID(),
        name: line.name,
        monthlyCentavos: line.monthlyCentavos,
        position,
        updatedAt: new Date(),
      })),
    });
    return { seeded: true };
  },

  monthResult: async (
    query: { month: Date },
    principal: AuthenticatedPrincipal,
  ) => {
    requireAdministrator(principal);
    const from = monthStart(query.month);
    const until = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1),
    );
    const [monthFacts, lines, expenses] = await Promise.all([
      facts.ofMonth(from, until),
      prisma.costBudgetLine.findMany({ orderBy: { position: 'asc' } }),
      prisma.expense.findMany({
        where: { incurredOn: { gte: from, lt: until } },
        select: {
          amountCentavos: true,
          expenseCategory: { select: { name: true } },
        },
      }),
    ]);
    const actualByLineCentavos: Record<string, number> = {};
    for (const expense of expenses) {
      const name = expense.expenseCategory.name;
      actualByLineCentavos[name] =
        (actualByLineCentavos[name] ?? 0) + expense.amountCentavos;
    }
    return {
      month: from,
      cashIncomeCentavos: monthFacts.cashIncomeCentavos,
      nutritionistCostCentavos: monthFacts.nutritionistCostCentavos,
      ...monthlyResult({
        cashIncomeCentavos: monthFacts.cashIncomeCentavos,
        taxRatePercent: monthFacts.taxRatePercent,
        budgetLines: lines,
        contingencyPercent,
        actualByLineCentavos,
        nutritionistCostCentavos: monthFacts.nutritionistCostCentavos,
      }),
    };
  },
});

export type Finance = ReturnType<typeof createPrismaFinance>;
