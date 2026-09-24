import {
  getExpenseReport,
  getGetExpenseReportQueryKey,
  getGetIncomeReportQueryKey,
  getIncomeReport,
  type AdminBranchDto,
  type ExpenseReportDto,
  type IncomeReportDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { everyBranchesQueryOptions } from "../catalog/branches/branch-queries";
import { addDays, boliviaInstant } from "../lib/bolivia-time";
import { archivedLast } from "../lib/named";
import type { ReportRange } from "./report-search";

/**
 * Both halves take the same instants: Bolivia midnight of the first day and
 * of the day after the last (the expense report reads them back as civil
 * dates, BKO-002). "Todas las sucursales" sends no Branch.
 */
const reportParams = (range: ReportRange, branchId: string | undefined) => ({
  from: boliviaInstant(range.from, "00:00"),
  until: boliviaInstant(addDays(range.to, 1), "00:00"),
  ...(branchId === undefined ? {} : { branchId }),
});

// ADR-0042: each key names the range and the Branch (or none for every
// Branch), so a single-Branch figure never shows under «Todas». No
// placeholder data either: a switch shows the loading line, never the
// previous scope's figures under the new label.
export const incomeReportQueryOptions = (
  range: ReportRange,
  branchId: string | undefined,
) => {
  const params = reportParams(range, branchId);
  return queryOptions({
    queryKey: getGetIncomeReportQueryKey(params),
    queryFn: async ({ signal }) =>
      (await getIncomeReport(params, { signal }, adminFetch))
        .data as IncomeReportDto,
  });
};

export const expenseReportQueryOptions = (
  range: ReportRange,
  branchId: string | undefined,
) => {
  const params = reportParams(range, branchId);
  return queryOptions({
    queryKey: getGetExpenseReportQueryKey(params),
    queryFn: async ({ signal }) =>
      (await getExpenseReport(params, { signal }, adminFetch))
        .data as ExpenseReportDto,
  });
};

// Every Branch, archived ones last: their past income and Expenses still
// count in a report over their months.
export const reportBranchesQueryOptions = () =>
  queryOptions({
    ...everyBranchesQueryOptions(),
    select: (branches: AdminBranchDto[]) => [...branches].sort(archivedLast),
  });
