import {
  getListDecidedFreezesQueryKey,
  getListRequestedFreezesQueryKey,
  listDecidedFreezes,
  listRequestedFreezes,
  type FreezeReviewDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

export type FreezeList = {
  items: FreezeReviewDto[];
  totalItems: number;
};

export const requestedFreezesQueryOptions = () =>
  queryOptions({
    queryKey: getListRequestedFreezesQueryKey(),
    queryFn: async ({ signal }): Promise<FreezeList> => {
      const freezes = (await listRequestedFreezes({ signal }, adminFetch))
        .data as FreezeReviewDto[];
      return { items: freezes, totalItems: freezes.length };
    },
  });

/** Approved and refused requests, latest decision first (finding 53). */
export const decidedFreezesQueryOptions = () =>
  queryOptions({
    queryKey: getListDecidedFreezesQueryKey(),
    queryFn: async ({ signal }): Promise<FreezeList> => {
      const freezes = (await listDecidedFreezes({ signal }, adminFetch))
        .data as FreezeReviewDto[];
      return { items: freezes, totalItems: freezes.length };
    },
  });
