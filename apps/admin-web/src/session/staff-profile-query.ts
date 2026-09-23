import {
  getCurrentStaffMemberProfile,
  getGetCurrentStaffMemberProfileQueryKey,
  type StaffProfileDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";

export const staffProfileQueryOptions = () =>
  queryOptions({
    queryKey: getGetCurrentStaffMemberProfileQueryKey(),
    queryFn: async ({ signal }) =>
      (await getCurrentStaffMemberProfile({ signal }, adminFetch))
        .data as StaffProfileDto,
  });
