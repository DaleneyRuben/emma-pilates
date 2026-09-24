import {
  getListAdminClientsQueryKey,
  listAdminClients,
  type AdminClientPageDto,
  type ListAdminClientsParams,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { ClientSearch } from "../people-search";

// Studio-wide, so the key never names the selected Branch (AW34 shows the
// selector but ignores it here).
export const clientTableQueryOptions = (search: ClientSearch) => {
  const params: ListAdminClientsParams = {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.q === undefined ? {} : { q: search.q }),
  };
  return queryOptions({
    queryKey: getListAdminClientsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminClients(params, { signal }, adminFetch))
        .data as AdminClientPageDto,
    placeholderData: keepPreviousData,
  });
};
