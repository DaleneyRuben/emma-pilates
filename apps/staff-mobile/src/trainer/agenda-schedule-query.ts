import {
  getListTrainerScheduleQueryKey,
  listTrainerSchedule,
  type ListTrainerScheduleParams,
} from "@pilates/api-contracts";
import { useQueries } from "@tanstack/react-query";

import { requireOk } from "./require-ok";

/**
 * One day of Mi agenda as a query, cancelled classes included (FIX-042). The
 * day list and the week strip's counts share it, so a day is fetched once.
 */
export function agendaDayQuery(on: string, fetcher: typeof globalThis.fetch) {
  const params: ListTrainerScheduleParams = { on, includeCancelled: true };
  return {
    queryKey: getListTrainerScheduleQueryKey(params),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      listTrainerSchedule(params, { signal }, fetcher).then((response) =>
        requireOk(response, "The agenda could not be loaded"),
      ),
  };
}

/**
 * E1 B: how many standing classes (cancelled ones aside) each day of the week
 * holds, undefined while a day loads or when it could not be read.
 */
export function useWeekClassCounts(
  dates: readonly string[],
  fetcher: typeof globalThis.fetch,
): Record<string, number | undefined> {
  return useQueries({
    queries: dates.map((date) => agendaDayQuery(date, fetcher)),
    combine: (results) =>
      Object.fromEntries(
        results.map((result, index) => [
          dates[index],
          result.data?.status === 200
            ? result.data.data.filter((session) => (session.cancellation ?? null) === null).length
            : undefined,
        ]),
      ),
  });
}
