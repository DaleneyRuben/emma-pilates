import {
  createPromotion,
  deletePromotion,
  getListAdminPromotionsQueryKey,
  listAdminPromotions,
  publishPromotion,
  reorderPromotions,
  unpublishPromotion,
  updatePromotion,
  type AdminPromotionDto,
  type PromotionInputDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";
import { idempotencyHeaders } from "../api/idempotency-key";

// AW17: every live Promotion in carousel order, one unpaged list (UPL-002);
// Promotions belong to the studio, so no key names a Branch.
export const promotionListQueryOptions = () =>
  queryOptions({
    queryKey: getListAdminPromotionsQueryKey(),
    queryFn: async ({ signal }) =>
      (await listAdminPromotions({ signal }, adminFetch))
        .data as AdminPromotionDto[],
  });

// AW17: the drop persists the whole carousel order in one call; the answer
// is the list in its new order, so it replaces the cached read directly.
export function usePromotionOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promotionIds: string[]): Promise<AdminPromotionDto[]> =>
      (await reorderPromotions({ promotionIds }, undefined, adminFetch))
        .data as AdminPromotionDto[],
    onSuccess: (promotions) =>
      queryClient.setQueryData(getListAdminPromotionsQueryKey(), promotions),
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: getListAdminPromotionsQueryKey(),
      }),
  });
}

type PromotionChange =
  | { kind: "create"; input: PromotionInputDto; idempotencyKey: string }
  | { kind: "update"; promotionId: string; input: PromotionInputDto }
  | { kind: "publish"; promotionId: string }
  | { kind: "unpublish"; promotionId: string }
  | { kind: "delete"; promotionId: string };

// AW18: create once per Idempotency-Key (ADR-0060), edit, publish,
// unpublish, or delete (which archives, BKM-001); every change refreshes
// the one carousel list. The Client's own carousel read is not cached here.
export function usePromotionChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      change: PromotionChange,
    ): Promise<AdminPromotionDto | null> => {
      switch (change.kind) {
        case "create":
          return (
            await createPromotion(
              change.input,
              idempotencyHeaders(change.idempotencyKey),
              adminFetch,
            )
          ).data as AdminPromotionDto;
        case "update":
          return (
            await updatePromotion(
              change.promotionId,
              change.input,
              undefined,
              adminFetch,
            )
          ).data as AdminPromotionDto;
        case "publish":
          return (
            await publishPromotion(change.promotionId, undefined, adminFetch)
          ).data as AdminPromotionDto;
        case "unpublish":
          return (
            await unpublishPromotion(change.promotionId, undefined, adminFetch)
          ).data as AdminPromotionDto;
        case "delete":
          await deletePromotion(change.promotionId, undefined, adminFetch);
          return null;
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: getListAdminPromotionsQueryKey(),
      }),
  });
}
