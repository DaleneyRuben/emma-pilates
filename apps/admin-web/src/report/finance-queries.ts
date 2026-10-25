import {
  getGetMonthResultQueryKey,
  getMonthResult,
  seedOpeningBudget,
  type MonthResultDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";

export const monthResultQueryOptions = (month: string) =>
  queryOptions({
    queryKey: getGetMonthResultQueryKey({ month }),
    queryFn: async ({ signal }) =>
      (await getMonthResult({ month }, { signal }, adminFetch))
        .data as MonthResultDto,
  });

export const seedOpeningBudgetRequest = () =>
  seedOpeningBudget(undefined, adminFetch).then((response) => response.data);
