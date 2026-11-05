import { useQuery } from "@tanstack/react-query";
import { branchSuppliesQueryOptions } from "../back-office/supplies/supply-queries";
import { payStatementsQueryOptions } from "../back-office/payroll/pay-statement-queries";
import { feedbackTableQueryOptions } from "../feedback/feedback-queries";
import { requestedFreezesQueryOptions } from "../oversight/freezes/freeze-queries";
import { contactAlertCountQueryOptions } from "../people/contact-alerts/contact-alert-queries";
import { pendingPaymentCountQueryOptions } from "../payments/payment-queries";
import type { PendingCounts } from "./home-pending";

/**
 * What waits on Inicio, from the reads the tabs already make. The
 * Coordinator also reads freezes, new comments and low stock (ADR-0108),
 * never payments or pay; a read that fails counts nothing rather than
 * blocking Inicio.
 */
export function usePendingCounts({
  seesMoney,
  branchId,
  month,
}: {
  seesMoney: boolean;
  branchId: string | undefined;
  month: string;
}): PendingCounts & { loading: boolean } {
  const payments = useQuery({
    ...pendingPaymentCountQueryOptions(),
    enabled: seesMoney,
  });
  const freezes = useQuery(requestedFreezesQueryOptions());
  const contactAlerts = useQuery(contactAlertCountQueryOptions());
  const feedback = useQuery(
    feedbackTableQueryOptions({
      page: 1,
      pageSize: 20,
      status: "all",
      app: "all",
    }),
  );
  const lowStock = useQuery({
    ...branchSuppliesQueryOptions(branchId ?? ""),
    select: (page) => page.lowStockCount,
    enabled: branchId !== undefined,
  });
  const statements = useQuery({
    ...payStatementsQueryOptions({ month }),
    enabled: seesMoney,
  });

  return {
    // WEB-045: until every read Inicio counts has answered (or failed), it
    // cannot say «Todo al día»; it shows the branded loading state instead.
    loading: [
      payments,
      freezes,
      contactAlerts,
      feedback,
      lowStock,
      statements,
    ].some((query) => query.isLoading),
    payments: payments.data ?? 0,
    freezes: freezes.data?.totalItems ?? 0,
    contactAlerts: contactAlerts.data ?? 0,
    feedback: feedback.data?.newCount ?? 0,
    lowStock: lowStock.data ?? 0,
    statements:
      statements.data?.filter((statement) => statement.state === "draft")
        .length ?? 0,
  };
}
