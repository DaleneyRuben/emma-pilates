import {
  dismissRecommendation,
  getListRecommendationsQueryKey,
  listRecommendations,
  recomputeRecommendations,
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

export const recomputeRecommendationsRequest = (month: string) =>
  recomputeRecommendations({ month }, undefined, adminFetch).then(
    (response) => response.data,
  );
