import type { AdminPaymentDto, PaymentReviewDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { isApiError } from "../api/problem";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { SidePanelBody, SidePanelFooter } from "../components/panel/side-panel";
import { SummaryBlock, SummaryRow } from "../components/panel/summary-rows";
import { Button } from "../components/ui/button";
import { formatCivilMoment } from "../lib/bolivia-time";
import { formatBolivianos } from "../lib/money";
import { paymentReviewQueryOptions } from "./payment-queries";
import { PaymentStatePill } from "./payment-state-pill";
import { ReceiptViewer } from "./receipt-viewer";

// The amount asked is the Plan price less the Credit applied (booking
// CONTEXT, Payment), so a reduced transfer is not mistaken for a short one.
function PaymentSummary({ review }: { review: PaymentReviewDto }) {
  return (
    <SummaryBlock title="Resumen">
      <SummaryRow label="Monto a verificar" figure>
        {formatBolivianos(review.amountDueCentavos)}
      </SummaryRow>
      {review.creditAppliedCentavos > 0 ? (
        <>
          <SummaryRow label="Precio del plan">
            <span className="tabular">
              {formatBolivianos(review.planPriceCentavos)}
            </span>
          </SummaryRow>
          <SummaryRow label="Crédito aplicado">
            <span className="tabular">
              −{formatBolivianos(review.creditAppliedCentavos)}
            </span>
          </SummaryRow>
        </>
      ) : null}
      <SummaryRow label="Fecha">
        <span className="tabular">{formatCivilMoment(review.submittedAt)}</span>
      </SummaryRow>
      <SummaryRow label="Método">Transferencia</SummaryRow>
      {review.state === "pending" ? null : (
        <SummaryRow label="Estado">
          <PaymentStatePill state={review.state} />
        </SummaryRow>
      )}
    </SummaryBlock>
  );
}

function ReviewBody({
  review,
  onRetry,
}: {
  review: PaymentReviewDto;
  onRetry: () => Promise<unknown>;
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
        <SidePanelFooter>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg">Confirmar pago</Button>
            <Button variant="destructive" size="lg">
              Rechazar
            </Button>
          </div>
        </SidePanelFooter>
      ) : null}
    </>
  );
}

// AW29: the transfer under review, read fresh from the backend each time
// the panel opens (the Staff app may have decided it meanwhile).
export function PaymentReviewPanel({ payment }: { payment: AdminPaymentDto }) {
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
  return <ReviewBody review={review.data} onRetry={() => review.refetch()} />;
}
