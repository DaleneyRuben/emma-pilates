import {
  exportAdminClients,
  getListAdminClientsQueryKey,
  listAdminClients,
  type AdminClientExportDto,
  type AdminClientExportRowDto,
  type AdminClientPageDto,
  type ExportAdminClientsFilter,
  type ListAdminClientsParams,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { ClientFilter, ClientSearch } from "../people-search";

// Studio-wide, so the key never names the selected Branch (AW34 shows the
// selector but ignores it here).
export const clientTableQueryOptions = (search: ClientSearch) => {
  const params: ListAdminClientsParams = {
    page: search.page,
    pageSize: search.pageSize,
    ...(search.q === undefined ? {} : { q: search.q }),
    // «Cuenta cerrada» reads the Promotion Contacts instead (FIX-065).
    ...(search.filter === undefined || search.filter === "closed"
      ? {}
      : { filter: search.filter }),
  };
  return queryOptions({
    queryKey: getListAdminClientsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminClients(params, { signal }, adminFetch))
        .data as AdminClientPageDto,
    placeholderData: keepPreviousData,
  });
};

/**
 * FIX-065: every live Client the chip and search match, not just the page on
 * screen, for «Exportar CSV»; the backend audits it.
 */
export const fetchAllClients = async (
  filter: Exclude<ClientFilter, "closed"> | undefined,
  q: string | undefined,
): Promise<AdminClientExportRowDto[]> =>
  (
    (
      await exportAdminClients(
        {
          ...(filter === undefined
            ? {}
            : { filter: filter as ExportAdminClientsFilter }),
          ...(q === undefined ? {} : { q }),
        },
        undefined,
        adminFetch,
      )
    ).data as AdminClientExportDto
  ).items;
