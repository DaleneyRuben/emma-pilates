import type { AdminPaymentDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { SidePanelBody } from "../components/panel/side-panel";
import { paymentReviewQueryOptions } from "./payment-queries";

// AW29: the transfer under review, read fresh from the backend.
export function PaymentReviewPanel({ payment }: { payment: AdminPaymentDto }) {
  const review = useQuery(paymentReviewQueryOptions(payment.id));

  return (
    <SidePanelBody>
      {review.isPending ? (
        <LoadingNotice>Cargando el pago…</LoadingNotice>
      ) : review.isError ? (
        <QueryFailure
          error={review.error}
          what="el pago"
          onRetry={() => void review.refetch()}
        />
      ) : null}
    </SidePanelBody>
  );
}
