import {
  getListAdminCashClosesQueryKey,
  listAdminCashCloses,
  type CashCloseHistoryDto,
  type ListAdminCashClosesParams,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

// ADR-0042: the key names the Branch and the month, so another Branch's
// closes never show while the next ones load.
export const cashCloseHistoryQueryOptions = (
  branchId: string,
  month: string,
) => {
  const params: ListAdminCashClosesParams = { branchId, month };
  return queryOptions({
    queryKey: getListAdminCashClosesQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminCashCloses(params, { signal }, adminFetch))
        .data as CashCloseHistoryDto,
    placeholderData: keepPreviousData,
  });
};
