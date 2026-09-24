import {
  getListStaffMembersQueryKey,
  listStaffMembers,
  type ListStaffMembersParams,
  type StaffMemberPageDto,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
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
