// BKO-005 / decisions section 11. Money is centavos. Tax is a percent of cash
// income. The break-even is the cash income that covers fixed costs, variable
// costs, and the tax on that income: (fixed + variable) / (1 - rate).

export type BudgetLine = { name: string; monthlyCentavos: number };

export const breakEvenCentavos = (input: {
  fixedCostsCentavos: number;
  variableCostsCentavos: number;
  taxRatePercent: number;
}): number =>
  Math.round(
    (input.fixedCostsCentavos + input.variableCostsCentavos) /
      (1 - input.taxRatePercent / 100),
  );

export const monthlyResult = (input: {
  cashIncomeCentavos: number;
  taxRatePercent: number;
  budgetLines: BudgetLine[];
  contingencyPercent: number;
  actualByLineCentavos: Record<string, number>;
  nutritionistCostCentavos: number;
  /** The month's Salary Payments, by the budget line each one pays. */
  salaries?: { byLineCentavos: Record<string, number>; totalCentavos: number };
}) => {
  const salaries = input.salaries ?? { byLineCentavos: {}, totalCentavos: 0 };
  const budgetSubtotalCentavos = input.budgetLines.reduce(
    (total, line) => total + line.monthlyCentavos,
    0,
  );
  const contingencyCentavos = Math.round(
    (budgetSubtotalCentavos * input.contingencyPercent) / 100,
  );
  const taxCentavos = Math.round(
    (input.cashIncomeCentavos * input.taxRatePercent) / 100,
  );
  const actualCentavos = Object.values(input.actualByLineCentavos).reduce(
    (total, amount) => total + amount,
    0,
  );
  const budgetTotalCentavos = budgetSubtotalCentavos + contingencyCentavos;
  return {
    taxRatePercent: input.taxRatePercent,
    taxCentavos,
    budgetSubtotalCentavos,
    contingencyCentavos,
    budgetTotalCentavos,
    breakEvenCentavos: breakEvenCentavos({
      fixedCostsCentavos: budgetTotalCentavos,
      variableCostsCentavos: input.nutritionistCostCentavos,
      taxRatePercent: input.taxRatePercent,
    }),
    lines: input.budgetLines.map((line) => ({
      name: line.name,
      budgetCentavos: line.monthlyCentavos,
      actualCentavos:
        (input.actualByLineCentavos[line.name] ?? 0) +
        (salaries.byLineCentavos[line.name] ?? 0),
    })),
    salariesCentavos: salaries.totalCentavos,
    resultCentavos:
      input.cashIncomeCentavos -
      taxCentavos -
      actualCentavos -
      salaries.totalCentavos -
      input.nutritionistCostCentavos,
  };
};
