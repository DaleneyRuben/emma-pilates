import type { AdminPaymentDto, PaymentReviewDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { isApiError } from "../api/problem";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { SidePanelBody } from "../components/panel/side-panel";
import { SummaryBlock, SummaryRow } from "../components/panel/summary-rows";
import { formatCivilMoment } from "../lib/bolivia-time";
import { formatBolivianos } from "../lib/money";
import { PaymentDecision } from "./payment-decision";
import { paymentReviewQueryOptions } from "./payment-queries";
import { PaymentStatePill } from "./payment-state-pill";
import { ReceiptViewer } from "./receipt-viewer";

// The amount asked is what the Client transferred. Credit is retired
// (PAY-005), so no Credit line is shown, even on an older Payment.
function PaymentSummary({ review }: { review: PaymentReviewDto }) {
  return (
    <SummaryBlock title="Resumen">
      <SummaryRow label="Monto a verificar" figure>
        {formatBolivianos(review.amountDueCentavos)}
      </SummaryRow>
      <SummaryRow label="Fecha">
        <span className="tabular">{formatCivilMoment(review.submittedAt)}</span>
      </SummaryRow>
      <SummaryRow label="Método">Transferencia</SummaryRow>
      {review.state === "pending" ? null : (
        <SummaryRow label="Estado">
          <PaymentStatePill state={review.state} />
        </SummaryRow>
      )}
      {review.rejectionReason === null ||
      review.rejectionReason === undefined ? null : (
        <SummaryRow label="Motivo">{review.rejectionReason}</SummaryRow>
      )}
    </SummaryBlock>
  );
}

function ReviewBody({
  review,
  clientId,
  onRetry,
  onDone,
}: {
  review: PaymentReviewDto;
  clientId: string;
  onRetry: () => Promise<unknown>;
  onDone: (notice: string) => void;
}) {
  return (
    <>
      <SidePanelBody>
        {review.state === "pending" ? null : (
          <p
            role="status"
            className="rounded-control border border-divisor bg-superficie px-3 py-2 text-nota text-texto-secundario"
          >
            Otra persona ya decidió este pago.
          </p>
        )}
        <PaymentSummary review={review} />
        <ReceiptViewer
          receiptUrl={review.receiptUrl ?? null}
          mediaType={review.receipt?.mediaType}
          clientName={review.clientName}
          onRetry={onRetry}
        />
      </SidePanelBody>
      {review.state === "pending" ? (
        <PaymentDecision review={review} clientId={clientId} onDone={onDone} />
      ) : null}
    </>
  );
}

// AW29: the transfer under review, read fresh from the backend each time
// the panel opens (the Staff app may have decided it meanwhile).
export function PaymentReviewPanel({
  payment,
  onDone,
}: {
  payment: AdminPaymentDto;
  onDone: (notice: string) => void;
}) {
  const review = useQuery(paymentReviewQueryOptions(payment.id));

  if (review.isPending) {
    return (
      <SidePanelBody>
        <LoadingNotice>Cargando el pago…</LoadingNotice>
      </SidePanelBody>
    );
  }
  if (review.isError) {
    return (
      <SidePanelBody>
        {isApiError(review.error) &&
        review.error.code === "payment_not_found" ? (
          <p role="alert" className="text-cuerpo text-texto-secundario">
            Este pago ya no existe. Cierra el panel y vuelve a abrir la lista.
          </p>
        ) : (
          <QueryFailure
            error={review.error}
            what="el pago"
            onRetry={() => void review.refetch()}
          />
        )}
      </SidePanelBody>
    );
  }
  return (
    <ReviewBody
      review={review.data}
      clientId={payment.clientId}
      onRetry={() => review.refetch()}
      onDone={onDone}
    />
  );
}
