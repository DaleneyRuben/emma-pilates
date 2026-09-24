import {
  getListAdminSuppliesQueryKey,
  listAdminSupplies,
  type AdminSupplyPageDto,
  type ListAdminSuppliesParams,
} from "@pilates/api-contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { ListSearch } from "../../components/table/pagination";

const readSupplies = async (
  params: ListAdminSuppliesParams,
  signal: AbortSignal,
): Promise<AdminSupplyPageDto> =>
  (await listAdminSupplies(params, { signal }, adminFetch))
    .data as AdminSupplyPageDto;

const suppliesOf = (params: ListAdminSuppliesParams) =>
  queryOptions({
    queryKey: getListAdminSuppliesQueryKey(params),
    queryFn: ({ signal }) => readSupplies(params, signal),
  });

// ADR-0042: every Supply read names its Branch, so switching Branch never
// shows another Branch's stock and a change refreshes only its own Branch.
export const supplyTableQueryOptions = (branchId: string, search: ListSearch) =>
  queryOptions({
    ...suppliesOf({
      branchId,
      status: "active",
      page: search.page,
      pageSize: search.pageSize,
    }),
    placeholderData: keepPreviousData,
  });

// The selected Branch's active Supplies in one page of the backend's maximum:
// the Insumo list of Registrar retiro and Registrar reposición, and the
// sidebar's low-stock count, which the backend counts on every page.
export const branchSuppliesQueryOptions = (branchId: string) =>
  suppliesOf({ branchId, status: "active", page: 1, pageSize: 100 });
