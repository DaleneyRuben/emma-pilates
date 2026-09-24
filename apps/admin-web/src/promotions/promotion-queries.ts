import {
  getListAdminPromotionsQueryKey,
  listAdminPromotions,
  type AdminPromotionDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
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
