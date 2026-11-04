import {
  approvePayStatement,
  draftPayStatements,
  getListPayStatementsQueryKey,
  listPayStatements,
  type PayStatementDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import type { PayPeriodQuery } from "./pay-period-search";

export const payStatementsQueryOptions = (period: PayPeriodQuery) =>
  queryOptions({
    queryKey: getListPayStatementsQueryKey(period),
    queryFn: async ({ signal }) =>
      (await listPayStatements(period, { signal }, adminFetch))
        .data as PayStatementDto[],
  });

export const draftPayStatementsRequest = (period: PayPeriodQuery) =>
  draftPayStatements(period, undefined, adminFetch).then(
    (response) => response.data,
  );

export const approvePayStatementRequest = (statementId: string) =>
  approvePayStatement(statementId, undefined, adminFetch).then(
    (response) => response.data,
  );
