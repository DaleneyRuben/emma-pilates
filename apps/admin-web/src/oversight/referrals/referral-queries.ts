import {
  getListAdminReferralsQueryKey,
  listAdminReferrals,
  type AdminReferralDto,
  type AdminReferralPageDto,
  type ListAdminReferralsParams,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import { nameSearchParams, type NameSearch } from "../oversight-search";

/** The list's rows keyed by their Referral. */
export type ReferralRow = AdminReferralDto & { id: string };

// Studio-wide, so the key never names the selected Branch (AW34 shows the
// selector but ignores it here).
export const referralTableQueryOptions = (search: NameSearch) => {
  const params: ListAdminReferralsParams = nameSearchParams(search);
  return queryOptions({
    queryKey: getListAdminReferralsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminReferrals(params, { signal }, adminFetch))
        .data as AdminReferralPageDto,
    select: (page) => ({
      ...page,
      items: page.items.map((item): ReferralRow => ({
        ...item,
        id: item.referralId,
      })),
    }),
    placeholderData: keepPreviousData,
  });
};
