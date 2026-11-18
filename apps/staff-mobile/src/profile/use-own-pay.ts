import {
  getListOwnPayStatementsQueryKey,
  getListOwnSalaryPaymentsQueryKey,
  useListOwnPayStatements,
  useListOwnSalaryPayments,
} from "@pilates/api-contracts";
import { usePullToRefresh, useRefetchOnFocus } from "@pilates/mobile-core";

import { useStaffFetcher } from "../staff-fetcher";

/** «Mis pagos» and a statement's screen read the same two lists. */
export function useOwnPay() {
  const fetcher = useStaffFetcher();
  const statements = useListOwnPayStatements({ fetcher, query: { refetchOnMount: "always" } });
  const payments = useListOwnSalaryPayments({ fetcher, query: { refetchOnMount: "always" } });
  const queryKeys = [getListOwnPayStatementsQueryKey(), getListOwnSalaryPaymentsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const pending = statements.isPending || payments.isPending;
  const loaded =
    statements.data?.status === 200 && payments.data?.status === 200
      ? { statements: statements.data.data, payments: payments.data.data }
      : null;
  const retry = () => {
    void statements.refetch();
    void payments.refetch();
  };
  return { loaded, pending, refreshControl, retry };
}
