import type { ExpenseReportDto, IncomeReportDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import {
  changeLine,
  comparedMonths,
  type ComparedMonth,
} from "./report-period";
import {
  expenseReportQueryOptions,
  incomeReportQueryOptions,
} from "./report-queries";
import type { ReportRange } from "./report-search";

export type MonthReport = {
  month: ComparedMonth;
  income: IncomeReportDto;
  expenses: ExpenseReportDto;
};

function useMonthReport(
  month: ComparedMonth,
  branchId: string | undefined,
  enabled: boolean,
) {
  const income = useQuery({
    ...incomeReportQueryOptions(month, branchId),
    enabled,
  });
  const expenses = useQuery({
    ...expenseReportQueryOptions(month, branchId),
    enabled,
  });
  return { income, expenses };
}

/**
 * FIX-091 (W5 B): the month the range ends in against the month before,
 * read from the same two reports as the page (the current month's request is
 * the page's own when the range is that month).
 */
export function useMonthComparison(
  range: ReportRange,
  branchId: string | undefined,
  enabled: boolean,
) {
  const months = comparedMonths(range.to);
  const current = useMonthReport(months.current, branchId, enabled);
  const previous = useMonthReport(months.previous, branchId, enabled);
  const queries = [
    current.income,
    current.expenses,
    previous.income,
    previous.expenses,
  ];
  const failed = queries.find((query) => query.isError);
  const pair =
    current.income.data === undefined ||
    current.expenses.data === undefined ||
    previous.income.data === undefined ||
    previous.expenses.data === undefined
      ? undefined
      : ([
          {
            month: months.current,
            income: current.income.data,
            expenses: current.expenses.data,
          },
          {
            month: months.previous,
            income: previous.income.data,
            expenses: previous.expenses.data,
          },
        ] as const);
  // The line under Entró only fits a range that is the month so far.
  const change =
    pair === undefined || range.from !== months.current.from
      ? null
      : changeLine(
          pair[0].income.totalCentavos,
          pair[1].income.totalCentavos,
          months.previous.month,
        );
  return {
    pair,
    change,
    error: failed?.error ?? null,
    retry: () => queries.forEach((query) => void query.refetch()),
  };
}

export type MonthComparison = ReturnType<typeof useMonthComparison>;
