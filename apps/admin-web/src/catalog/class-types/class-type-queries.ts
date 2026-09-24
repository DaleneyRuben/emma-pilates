import {
  archiveClassType,
  createClassType,
  getListAdminClassTypesQueryKey,
  listAdminClassTypes,
  updateClassType,
  type AdminClassTypeDto,
  type AdminClassTypePageDto,
  type ClassTypeInputDto,
  type ListAdminClassTypesParams,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

export const classTypeListQueryOptions = (params: ListAdminClassTypesParams) =>
  queryOptions({
    queryKey: getListAdminClassTypesQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminClassTypes(params, { signal }, adminFetch))
        .data as AdminClassTypePageDto,
    placeholderData: keepPreviousData,
  });

type ClassTypeChange =
  | { kind: "create"; input: ClassTypeInputDto }
  | { kind: "update"; classTypeId: string; input: ClassTypeInputDto }
  | { kind: "archive"; classTypeId: string };

// Class Types are studio-wide: a change refreshes every Class Type list,
// including the one the Session form picks from.
export function useClassTypeChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: ClassTypeChange): Promise<AdminClassTypeDto> => {
      const response =
        change.kind === "create"
          ? await createClassType(change.input, undefined, adminFetch)
          : change.kind === "update"
            ? await updateClassType(
                change.classTypeId,
                change.input,
                undefined,
                adminFetch,
              )
            : await archiveClassType(change.classTypeId, undefined, adminFetch);
      return response.data as AdminClassTypeDto;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListAdminClassTypesQueryKey(),
      }),
  });
}
