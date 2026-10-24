import {
  dismissRecommendation,
  getListRecommendationsQueryKey,
  listRecommendations,
  type RecommendationDto,
  type RecommendationListDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";

export const recommendationsQueryOptions = (month: string) =>
  queryOptions({
    queryKey: getListRecommendationsQueryKey({ month }),
    queryFn: async ({ signal }) =>
      (await listRecommendations({ month }, { signal }, adminFetch))
        .data as RecommendationListDto,
  });

export const dismissRecommendationRequest = (id: string) =>
  dismissRecommendation(id, undefined, adminFetch).then(
    (response) => response.data as RecommendationDto,
  );
