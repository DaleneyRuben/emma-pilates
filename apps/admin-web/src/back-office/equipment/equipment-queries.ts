import {
  archiveEquipment,
  archiveEquipmentType,
  createEquipment,
  createEquipmentType,
  getListEquipmentFlaggedSessionsQueryKey,
  getListEquipmentIssuesQueryKey,
  getListEquipmentQueryKey,
  getListEquipmentStocksQueryKey,
  getListEquipmentTypesQueryKey,
  listEquipment,
  listEquipmentIssues,
  listEquipmentStocks,
  listEquipmentTypes,
  renameEquipmentType,
  reportEquipmentIssue,
  reportEquipmentStockDamage,
  resolveEquipmentIssue,
  setEquipmentStockQuantity,
  writeOffEquipmentIssue,
  type EquipmentDamageInputDto,
  type EquipmentInputDto,
  type EquipmentIssuePageDto,
  type EquipmentListDto,
  type EquipmentStockDto,
  type EquipmentStockInputDto,
  type EquipmentStockListDto,
  type EquipmentTypeInputDto,
  type EquipmentTypeListDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { isBranchScopedKey } from "../../api/branch-scoped-key";
import { adminFetch } from "../../api/fetcher";

export type IssueStatus = "open" | "resolved";

const typesPath = getListEquipmentTypesQueryKey()[0];

// FIX-067: the studio's equipment types, the same in every Branch.
export const equipmentTypesQueryOptions = () =>
  queryOptions({
    queryKey: getListEquipmentTypesQueryKey(),
    queryFn: async ({ signal }) =>
      (
        (await listEquipmentTypes({ signal }, adminFetch))
          .data as EquipmentTypeListDto
      ).items,
  });

// ADR-0042: every read names its Branch.
export const branchEquipmentQueryOptions = (branchId: string) =>
  queryOptions({
    queryKey: getListEquipmentQueryKey({ branchId }),
    queryFn: async ({ signal }) =>
      (
        (await listEquipment({ branchId }, { signal }, adminFetch))
          .data as EquipmentListDto
      ).items,
  });

export const branchStocksQueryOptions = (branchId: string) =>
  queryOptions({
    queryKey: getListEquipmentStocksQueryKey({ branchId }),
    queryFn: async ({ signal }) =>
      (
        (await listEquipmentStocks({ branchId }, { signal }, adminFetch))
          .data as EquipmentStockListDto
      ).items,
  });

/** A stock as the Branch's list has it now, or the panel's snapshot. */
export function useBranchStock(
  branchId: string,
  snapshot: EquipmentStockDto,
): EquipmentStockDto {
  const { data } = useQuery(branchStocksQueryOptions(branchId));
  return data?.find((row) => row.typeId === snapshot.typeId) ?? snapshot;
}

// A Branch has a handful of machines, so one page of 100 faults is the list.
export const branchIssuesQueryOptions = (
  branchId: string,
  status: IssueStatus,
) => {
  const params = { branchId, status, page: 1, pageSize: 100 } as const;
  return queryOptions({
    queryKey: getListEquipmentIssuesQueryKey(params),
    queryFn: async ({ signal }) =>
      (
        (await listEquipmentIssues(params, { signal }, adminFetch))
          .data as EquipmentIssuePageDto
      ).items,
  });
};

// A change moves the lists, the faults, and Horario's flags of its Branch;
// renaming or removing a type moves them in every Branch, and any type
// change moves the studio's type list.
const refreshEquipment = (
  queryClient: QueryClient,
  branchId: string,
  change: EquipmentChange,
) => {
  const studioWide =
    change.kind === "rename-type" || change.kind === "archive-type";
  return Promise.all([
    ...[
      getListEquipmentQueryKey()[0],
      getListEquipmentStocksQueryKey()[0],
      getListEquipmentIssuesQueryKey()[0],
      getListEquipmentFlaggedSessionsQueryKey()[0],
    ].map((path) =>
      queryClient.invalidateQueries(
        studioWide
          ? { queryKey: [path] }
          : { predicate: isBranchScopedKey(path, branchId) },
      ),
    ),
    queryClient.invalidateQueries({ queryKey: [typesPath] }),
  ]);
};

export type EquipmentChange =
  | { kind: "create"; input: EquipmentInputDto }
  | { kind: "archive"; equipmentId: string }
  | {
      kind: "report";
      equipmentId: string;
      description: string;
      outOfService: boolean;
    }
  | { kind: "resolve"; issueId: string }
  | { kind: "write-off"; issueId: string }
  | { kind: "create-type"; input: EquipmentTypeInputDto }
  | { kind: "rename-type"; typeId: string; name: string }
  | { kind: "archive-type"; typeId: string }
  | { kind: "set-stock"; input: EquipmentStockInputDto }
  | { kind: "damage"; input: EquipmentDamageInputDto };

const send = async (change: EquipmentChange): Promise<unknown> => {
  switch (change.kind) {
    case "create":
      return createEquipment(change.input, undefined, adminFetch);
    case "archive":
      return archiveEquipment(change.equipmentId, undefined, adminFetch);
    case "report":
      return reportEquipmentIssue(
        change.equipmentId,
        { description: change.description, outOfService: change.outOfService },
        undefined,
        adminFetch,
      );
    case "resolve":
      return resolveEquipmentIssue(change.issueId, undefined, adminFetch);
    case "write-off":
      return writeOffEquipmentIssue(change.issueId, undefined, adminFetch);
    case "create-type":
      return createEquipmentType(change.input, undefined, adminFetch);
    case "rename-type":
      return renameEquipmentType(
        change.typeId,
        { name: change.name },
        undefined,
        adminFetch,
      );
    case "archive-type":
      return archiveEquipmentType(change.typeId, undefined, adminFetch);
    case "set-stock":
      return setEquipmentStockQuantity(change.input, undefined, adminFetch);
    case "damage":
      return reportEquipmentStockDamage(change.input, undefined, adminFetch);
  }
};

// AW37: every change to one Branch's Equipment, its types and its faults.
// A refusal refreshes too: it usually means the lists moved meanwhile.
export function useEquipmentChange(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSettled: (_data, _error, change) =>
      refreshEquipment(queryClient, branchId, change),
  });
}
