import {
  archiveEquipment,
  createEquipment,
  getListEquipmentFlaggedSessionsQueryKey,
  getListEquipmentIssuesQueryKey,
  getListEquipmentQueryKey,
  listEquipment,
  listEquipmentIssues,
  reportEquipmentIssue,
  resolveEquipmentIssue,
  type EquipmentDto,
  type EquipmentInputDto,
  type EquipmentIssueDto,
  type EquipmentIssuePageDto,
  type EquipmentListDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { isBranchScopedKey } from "../../api/branch-scoped-key";
import { adminFetch } from "../../api/fetcher";

export type IssueStatus = "open" | "resolved";

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

// A change moves the list, the faults, and Horario's flags of its Branch.
const refreshBranchEquipment = (queryClient: QueryClient, branchId: string) =>
  Promise.all(
    [
      getListEquipmentQueryKey()[0],
      getListEquipmentIssuesQueryKey()[0],
      getListEquipmentFlaggedSessionsQueryKey()[0],
    ].map((path) =>
      queryClient.invalidateQueries({
        predicate: isBranchScopedKey(path, branchId),
      }),
    ),
  );

export type EquipmentChange =
  | { kind: "create"; input: EquipmentInputDto }
  | { kind: "archive"; equipmentId: string }
  | {
      kind: "report";
      equipmentId: string;
      description: string;
      outOfService: boolean;
    }
  | { kind: "resolve"; issueId: string };

const send = async (
  change: EquipmentChange,
): Promise<EquipmentDto | EquipmentIssueDto> => {
  switch (change.kind) {
    case "create":
      return (await createEquipment(change.input, undefined, adminFetch))
        .data as EquipmentDto;
    case "archive":
      return (await archiveEquipment(change.equipmentId, undefined, adminFetch))
        .data as EquipmentDto;
    case "report":
      return (
        await reportEquipmentIssue(
          change.equipmentId,
          {
            description: change.description,
            outOfService: change.outOfService,
          },
          undefined,
          adminFetch,
        )
      ).data as EquipmentIssueDto;
    case "resolve":
      return (
        await resolveEquipmentIssue(change.issueId, undefined, adminFetch)
      ).data as EquipmentIssueDto;
  }
};

// AW37: every change to one Branch's Equipment and its faults.
export function useEquipmentChange(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => refreshBranchEquipment(queryClient, branchId),
  });
}
