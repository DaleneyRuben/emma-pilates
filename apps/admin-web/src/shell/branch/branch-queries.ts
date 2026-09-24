import {
  getListAdminBranchesQueryKey,
  listAdminBranches,
  type AdminBranchPageDto,
  type ListAdminBranchesParams,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { Branch } from "./branch-context";

// AW34: the selector offers only active Branches; archived ones keep their
// history but can no longer scope new work. A studio has a handful, so one
// page of the maximum size holds them all.
const activeBranchesParams: ListAdminBranchesParams = {
  status: "active",
  pageSize: 100,
};

export const activeBranchesQueryOptions = () =>
  queryOptions({
    queryKey: getListAdminBranchesQueryKey(activeBranchesParams),
    queryFn: async ({ signal }) => {
      const response = await listAdminBranches(
        activeBranchesParams,
        { signal },
        adminFetch,
      );
      return (response.data as AdminBranchPageDto).items.map(
        ({ id, name, address }): Branch => ({ id, name, address }),
      );
    },
  });
