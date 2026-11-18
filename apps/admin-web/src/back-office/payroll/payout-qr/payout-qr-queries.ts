import {
  getGetStaffMemberPayoutQrQueryKey,
  getStaffMemberPayoutQr,
  type PayoutQrResultDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../../api/fetcher";

// Never cached between views: the person may replace her QR at any time,
// and an expired one must stop showing the moment it expires.
export const payoutQrQueryOptions = (staffMemberId: string) =>
  queryOptions({
    queryKey: getGetStaffMemberPayoutQrQueryKey(staffMemberId),
    queryFn: async ({ signal }) =>
      (await getStaffMemberPayoutQr(staffMemberId, { signal }, adminFetch))
        .data as PayoutQrResultDto,
    staleTime: 0,
  });
