import {
  getGetMonthKpisQueryKey,
  getMonthKpis,
  type MonthKpisDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../api/fetcher";

export const monthKpisQueryOptions = (month: string) =>
  queryOptions({
    queryKey: getGetMonthKpisQueryKey({ month }),
    queryFn: async ({ signal }) =>
      (await getMonthKpis({ month }, { signal }, adminFetch))
        .data as MonthKpisDto,
  });

export const hasAmounts = (
  report: MonthKpisDto,
): report is MonthKpisDto & {
  cashCentavos: number;
  accruedCentavos: number;
  deferredCentavos: number;
} =>
  report.cashCentavos !== undefined &&
  report.accruedCentavos !== undefined &&
  report.deferredCentavos !== undefined;
