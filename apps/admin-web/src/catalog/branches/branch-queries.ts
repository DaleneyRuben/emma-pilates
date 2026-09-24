import {
  archiveBranch,
  createBranch,
  getListAdminBranchesQueryKey,
  listAdminBranches,
  updateBranch,
  type AdminBranchDto,
  type AdminBranchPageDto,
  type BranchInputDto,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { CatalogStatusSearch } from "../catalog-search";

export const branchTableQueryOptions = (search: CatalogStatusSearch) => {
  const params = {
    status: search.status,
    page: search.page,
    pageSize: search.pageSize,
  };
  return queryOptions({
    queryKey: getListAdminBranchesQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminBranches(params, { signal }, adminFetch))
        .data as AdminBranchPageDto,
    placeholderData: keepPreviousData,
  });
};

// Every Branch, archived ones too, in one page of the maximum: an old
// assignment (Personal) or a past report (Reporte) still needs its name.
const everyBranchParams = { status: "all", page: 1, pageSize: 100 } as const;

export const everyBranchesQueryOptions = () =>
  queryOptions({
    queryKey: getListAdminBranchesQueryKey(everyBranchParams),
    queryFn: async ({ signal }) =>
      (
        (await listAdminBranches(everyBranchParams, { signal }, adminFetch))
          .data as AdminBranchPageDto
      ).items,
  });

type BranchChange =
  | { kind: "create"; input: BranchInputDto }
  | { kind: "update"; branchId: string; input: BranchInputDto }
  | { kind: "archive"; branchId: string };

/**
 * Branches are not scoped by the selected Branch, so every Branch list (the
 * tables and the shell selector) shares the key prefix a change invalidates.
 */
export function useBranchChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: BranchChange): Promise<AdminBranchDto> => {
      const response =
        change.kind === "create"
          ? await createBranch(change.input, undefined, adminFetch)
          : change.kind === "update"
            ? await updateBranch(
                change.branchId,
                change.input,
                undefined,
                adminFetch,
              )
            : await archiveBranch(change.branchId, undefined, adminFetch);
      return response.data as AdminBranchDto;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListAdminBranchesQueryKey(),
      }),
  });
}
