import {
  approvePayStatement,
  draftPayStatements,
  getListPayStatementsQueryKey,
  listPayStatements,
  type PayStatementDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";

export const payStatementsQueryOptions = (month: string) =>
  queryOptions({
    queryKey: getListPayStatementsQueryKey({ month }),
    queryFn: async ({ signal }) =>
      (await listPayStatements({ month }, { signal }, adminFetch))
        .data as PayStatementDto[],
  });

export const draftPayStatementsRequest = (month: string) =>
  draftPayStatements({ month }, undefined, adminFetch).then(
    (response) => response.data,
  );

export const approvePayStatementRequest = (statementId: string) =>
  approvePayStatement(statementId, undefined, adminFetch).then(
    (response) => response.data,
  );
