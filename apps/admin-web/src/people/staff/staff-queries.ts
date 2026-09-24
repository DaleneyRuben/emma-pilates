import {
  changeStaffMemberBranches,
  changeStaffMemberRole,
  createStaffMember,
  deactivateStaffMember,
  getListStaffMembersQueryKey,
  listStaffMembers,
  resendStaffMemberActivation,
  type ChangeStaffRoleDto,
  type CreateStaffMemberDto,
  type ListStaffMembersParams,
  type StaffMemberDto,
  type StaffMemberPageDto,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { StaffSearch } from "../people-search";

export const staffTableQueryOptions = (search: StaffSearch) => {
  const params: ListStaffMembersParams = {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.role === "all" ? {} : { role: search.role }),
  };
  return queryOptions({
    queryKey: getListStaffMembersQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listStaffMembers(params, { signal }, adminFetch))
        .data as StaffMemberPageDto,
    placeholderData: keepPreviousData,
  });
};

type StaffChange =
  | { kind: "create"; input: CreateStaffMemberDto }
  | { kind: "resend"; staffMemberId: string }
  | { kind: "role"; staffMemberId: string; input: ChangeStaffRoleDto }
  | { kind: "branches"; staffMemberId: string; branchIds: string[] }
  | { kind: "deactivate"; staffMemberId: string };

const send = async (change: StaffChange) => {
  switch (change.kind) {
    case "create":
      return createStaffMember(change.input, undefined, adminFetch);
    case "resend":
      return resendStaffMemberActivation(
        change.staffMemberId,
        undefined,
        adminFetch,
      );
    case "role":
      return changeStaffMemberRole(
        change.staffMemberId,
        change.input,
        undefined,
        adminFetch,
      );
    case "branches":
      return changeStaffMemberBranches(
        change.staffMemberId,
        { branchIds: change.branchIds },
        undefined,
        adminFetch,
      );
    case "deactivate":
      return deactivateStaffMember(change.staffMemberId, undefined, adminFetch);
  }
};

/**
 * Every staff list shares one key prefix: the Personal table and the
 * Trainers Horario's Session form offers per Branch
 * (`branchTrainersQueryOptions`), so a change refreshes both and nothing
 * else (ADR-0042).
 */
export function useStaffChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: StaffChange): Promise<StaffMemberDto> =>
      (await send(change)).data as StaffMemberDto,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListStaffMembersQueryKey(),
      }),
  });
}
