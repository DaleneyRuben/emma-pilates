import {
  getListAdminPromotionsQueryKey,
  listAdminPromotions,
  reorderPromotions,
  type AdminPromotionDto,
} from "@pilates/api-contracts";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";

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
