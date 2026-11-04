import {
  getListFounderMembershipsQueryKey,
  listFounderMemberships,
  type FounderMembershipPageDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

// The old Fundadoras page's «N de 40 lugares», now under Todas's Fundadora
// chip (WEB-040). The Administrator's alone (ADR-0102, ADR-0108).
export const founderPlacesQueryOptions = () =>
  queryOptions({
    queryKey: getListFounderMembershipsQueryKey(),
    queryFn: async ({ signal }) =>
      (await listFounderMemberships({ signal }, adminFetch))
        .data as FounderMembershipPageDto,
    select: ({ granted, places }) => ({ granted, places }),
  });
