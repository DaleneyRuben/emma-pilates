import {
  getListAdminEvaluationsQueryKey,
  getListStaffMembersQueryKey,
  listAdminEvaluations,
  listStaffMembers,
  type AdminEvaluationDto,
  type AdminEvaluationPageDto,
  type ListAdminEvaluationsParams,
  type StaffMemberPageDto,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import { addDays, boliviaInstant } from "../../lib/bolivia-time";
import type { EvaluationSearch } from "./evaluation-search";

/** The list's rows keyed by their Evaluation. */
export type EvaluationRow = AdminEvaluationDto & { id: string };

// ADR-0042: the key names the Branch, the week, and the Nutritionist, so an
// Evaluation of another Branch never shows (they happen at a Branch, ADR-0001).
export const evaluationTableQueryOptions = (
  branchId: string,
  monday: string,
  search: EvaluationSearch,
) => {
  const params: ListAdminEvaluationsParams = {
    branchId,
    from: boliviaInstant(monday, "00:00"),
    until: boliviaInstant(addDays(monday, 7), "00:00"),
    page: search.page,
    pageSize: search.pageSize,
    ...(search.nutritionistStaffMemberId === undefined
      ? {}
      : { nutritionistStaffMemberId: search.nutritionistStaffMemberId }),
  };
  return queryOptions({
    queryKey: getListAdminEvaluationsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminEvaluations(params, { signal }, adminFetch))
        .data as AdminEvaluationPageDto,
    select: (page) => ({
      ...page,
      items: page.items.map((item): EvaluationRow => ({
        ...item,
        id: item.evaluationId,
      })),
    }),
    placeholderData: keepPreviousData,
  });
};

// The Nutritionists assigned to the Branch, deactivated ones too: their
// past Evaluations stay in the list. It shares the staff lists' key prefix,
// so a Personal change refreshes it.
export const branchNutritionistsQueryOptions = (branchId: string) => {
  const params = { role: "nutritionist", branchId, pageSize: 100 } as const;
  return queryOptions({
    queryKey: getListStaffMembersQueryKey(params),
    queryFn: async ({ signal }) =>
      (
        (await listStaffMembers(params, { signal }, adminFetch))
          .data as StaffMemberPageDto
      ).items.sort((a, b) => a.name.localeCompare(b.name, "es")),
  });
};
