import {
  getListAdminCreditsQueryKey,
  listAdminCredits,
  type AdminCreditBalanceDto,
  type AdminCreditPageDto,
  type ListAdminCreditsParams,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import { nameSearchParams, type NameSearch } from "../oversight-search";

/** The list's rows keyed by their Client. */
export type CreditRow = AdminCreditBalanceDto & { id: string };

// Studio-wide, so the key never names the selected Branch (AW34 shows the
// selector but ignores it here).
export const creditTableQueryOptions = (search: NameSearch) => {
  const params: ListAdminCreditsParams = nameSearchParams(search);
  return queryOptions({
    queryKey: getListAdminCreditsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminCredits(params, { signal }, adminFetch))
        .data as AdminCreditPageDto,
    select: (page) => ({
      ...page,
      items: page.items.map((item): CreditRow => ({
        ...item,
        id: item.clientId,
      })),
    }),
    placeholderData: keepPreviousData,
  });
};
