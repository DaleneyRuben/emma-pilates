import {
  getListFounderMembershipsQueryKey,
  listFounderMemberships,
  type FounderMembershipDto,
  type FounderMembershipPageDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

export type FounderRow = FounderMembershipDto & { id: string };

export const founderListQueryOptions = () =>
  queryOptions({
    queryKey: getListFounderMembershipsQueryKey(),
    queryFn: async ({ signal }) =>
      (await listFounderMemberships({ signal }, adminFetch))
        .data as FounderMembershipPageDto,
    select: (page) => ({
      ...page,
      items: page.items.map((item): FounderRow => ({
        ...item,
        id: item.membershipId,
      })),
      totalItems: page.items.length,
    }),
  });
