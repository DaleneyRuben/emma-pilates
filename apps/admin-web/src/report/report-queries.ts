import {
  getExpenseReport,
  getGetExpenseReportQueryKey,
  getGetIncomeReportQueryKey,
  getIncomeReport,
  getListAdminBranchesQueryKey,
  listAdminBranches,
  type AdminBranchDto,
  type AdminBranchPageDto,
  type ExpenseReportDto,
  type IncomeReportDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { addDays, boliviaInstant } from "../lib/bolivia-time";
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
const everyBranchParams = { status: "all", pageSize: 100 } as const;

export const reportBranchesQueryOptions = () =>
  queryOptions({
    queryKey: getListAdminBranchesQueryKey(everyBranchParams),
    queryFn: async ({ signal }) =>
      (
        (await listAdminBranches(everyBranchParams, { signal }, adminFetch))
          .data as AdminBranchPageDto
      ).items,
    select: (branches: AdminBranchDto[]) =>
      [...branches].sort(
        (a, b) =>
          Number(a.archivedAt !== null) - Number(b.archivedAt !== null) ||
          a.name.localeCompare(b.name, "es"),
      ),
  });
