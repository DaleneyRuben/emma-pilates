import {
  createPlan,
  getListAdminPlansQueryKey,
  listAdminPlans,
  setPlanVisibility,
  updatePlan,
  type AdminPlanDto,
  type AdminPlanPageDto,
  type ListAdminPlansParams,
  type PlanInputDto,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

export const planListQueryOptions = (params: ListAdminPlansParams) =>
  queryOptions({
    queryKey: getListAdminPlansQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminPlans(params, { signal }, adminFetch))
        .data as AdminPlanPageDto,
    placeholderData: keepPreviousData,
  });

type PlanChange =
  | { kind: "create"; input: PlanInputDto }
  | { kind: "update"; planId: string; input: PlanInputDto }
  | { kind: "visibility"; planId: string; visible: boolean };

// Plans are studio-wide (a Subscription works at any Branch), so a change
// refreshes every Plan list.
export function usePlanChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: PlanChange): Promise<AdminPlanDto> => {
      const response =
        change.kind === "create"
          ? await createPlan(change.input, undefined, adminFetch)
          : change.kind === "update"
            ? await updatePlan(
                change.planId,
                change.input,
                undefined,
                adminFetch,
              )
            : await setPlanVisibility(
                change.planId,
                { visible: change.visible },
                undefined,
                adminFetch,
              );
      return response.data as AdminPlanDto;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListAdminPlansQueryKey() }),
  });
}
