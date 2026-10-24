import {
  getListRequestedFreezesQueryKey,
  listRequestedFreezes,
  type FreezeReviewDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

export type RequestedFreezes = {
  items: FreezeReviewDto[];
  totalItems: number;
};

export const requestedFreezesQueryOptions = () =>
  queryOptions({
    queryKey: getListRequestedFreezesQueryKey(),
    queryFn: async ({ signal }): Promise<RequestedFreezes> => {
      const freezes = (await listRequestedFreezes({ signal }, adminFetch))
        .data as FreezeReviewDto[];
      return { items: freezes, totalItems: freezes.length };
    },
  });
