import {
  archiveSupply,
  createSupply,
  recordRestock,
  recordWithdrawal,
  getListAdminSuppliesQueryKey,
  listAdminSupplies,
  updateSupply,
  type AdminSupplyDto,
  type AdminSupplyPageDto,
  type ListAdminSuppliesParams,
  type SupplyChangeDto,
  type SupplyInputDto,
  type SupplyMovementDto,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import { idempotencyHeaders } from "../../api/idempotency-key";
import type { ListSearch } from "../../components/table/pagination";
import { refreshAfterSupplyChange } from "../back-office-cache";

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

type SupplyChange =
  | { kind: "create"; input: SupplyInputDto }
  | { kind: "update"; supplyId: string; input: SupplyChangeDto }
  | { kind: "archive"; supplyId: string };

const sendSupplyChange = async (change: SupplyChange) => {
  switch (change.kind) {
    case "create":
      return createSupply(change.input, undefined, adminFetch);
    case "update":
      return updateSupply(change.supplyId, change.input, undefined, adminFetch);
    case "archive":
      return archiveSupply(change.supplyId, undefined, adminFetch);
  }
};

// AW09: create, rename or re-threshold, and archive one Branch's Supply.
export function useSupplyChange(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: SupplyChange): Promise<AdminSupplyDto> =>
      (await sendSupplyChange(change)).data as AdminSupplyDto,
    onSuccess: (_supply, change) =>
      refreshAfterSupplyChange(queryClient, { branchId, kind: change.kind }),
  });
}

export type SupplyMovement = {
  kind: "withdrawal" | "restock";
  supplyId: string;
  quantity: number;
  idempotencyKey: string;
};

// AW10 and follow-up 48: units out or in, each once per Idempotency-Key.
export function useSupplyMovement(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      kind,
      supplyId,
      quantity,
      idempotencyKey,
    }: SupplyMovement): Promise<SupplyMovementDto> => {
      const record = kind === "withdrawal" ? recordWithdrawal : recordRestock;
      return (
        await record(
          supplyId,
          { quantity },
          idempotencyHeaders(idempotencyKey),
          adminFetch,
        )
      ).data as SupplyMovementDto;
    },
    onSuccess: (_movement, { kind }) =>
      refreshAfterSupplyChange(queryClient, { branchId, kind }),
  });
}
