import type { AdminPaymentDto, StaffInvoiceDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { isApiError } from "../api/problem";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { SidePanelBody } from "../components/panel/side-panel";
import { SummaryBlock, SummaryRow } from "../components/panel/summary-rows";
import { StatusPill } from "../components/ui/status-pill";
import { formatCivilMoment } from "../lib/bolivia-time";
import { formatBolivianos } from "../lib/money";
import { InvoiceFileCard } from "./invoice-file-card";
import { InvoiceUploadField } from "./invoice-upload-field";
import { paymentInvoiceQueryOptions } from "./invoice-queries";

const methods: Record<StaffInvoiceDto["method"], string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  credit_only: "Crédito",
  courtesy: "Cortesía",
};

function InvoiceState({ invoice }: { invoice: StaffInvoiceDto }) {
  if (invoice.invoiceIssued === null) {
    return invoice.voided ? (
      <span className="text-nota text-texto-tenue">Pago anulado</span>
    ) : (
      <StatusPill tone="advertencia">Por emitir</StatusPill>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <StatusPill tone="exito">Emitida</StatusPill>
      {invoice.file === null ? (
        <span className="text-ayuda text-texto-tenue">sin archivo</span>
      ) : null}
    </span>
  );
}

function InvoiceBody({ invoice }: { invoice: StaffInvoiceDto }) {
  const [replacing, setReplacing] = useState(false);
  const data = invoice.invoiceData;
  const canUpload =
    data !== null && !invoice.voided && (invoice.file === null || replacing);

  return (
    <SidePanelBody>
      <SummaryBlock title="Pago">
        <SummaryRow label="Qué compró">{invoice.purchaseLabel}</SummaryRow>
        <SummaryRow label="Monto" figure>
          {formatBolivianos(invoice.amountDueCentavos)}
        </SummaryRow>
        <SummaryRow label="Cómo pagó">{methods[invoice.method]}</SummaryRow>
        {invoice.confirmedAt === null ? null : (
          <SummaryRow label="Confirmado">
            <span className="tabular">
              {formatCivilMoment(invoice.confirmedAt)}
            </span>
          </SummaryRow>
        )}
        {invoice.voided ? (
          <SummaryRow label="Estado">
            <StatusPill tone="neutral">Anulado</StatusPill>
          </SummaryRow>
        ) : null}
      </SummaryBlock>
      {data === null ? (
        <SummaryBlock title="Factura">
          <SummaryRow label="Sin factura">
            La clienta no la pidió al pagar.
          </SummaryRow>
        </SummaryBlock>
      ) : (
        <SummaryBlock title="Factura">
          <SummaryRow label="NIT o CI">
            <span className="tabular">{data.taxId}</span>
          </SummaryRow>
          <SummaryRow label="A nombre de">{data.name}</SummaryRow>
          <SummaryRow label="Estado">
            <InvoiceState invoice={invoice} />
          </SummaryRow>
        </SummaryBlock>
      )}
      {invoice.file !== null && !replacing ? (
        <InvoiceFileCard
          invoice={invoice}
          file={invoice.file}
          onReplace={
            data !== null && !invoice.voided
              ? () => setReplacing(true)
              : undefined
          }
        />
      ) : null}
      {canUpload ? (
        <InvoiceUploadField
          paymentId={invoice.paymentId}
          clientName={invoice.clientName}
          onUploaded={() => setReplacing(false)}
          onCancel={replacing ? () => setReplacing(false) : undefined}
        />
      ) : null}
    </SidePanelBody>
  );
}

// FIX-044 (follow-up 248, W1/W2): a decided payment's panel, where the
// Administrator uploads, replaces or removes the issued invoice.
export function InvoicePanel({ payment }: { payment: AdminPaymentDto }) {
  const invoice = useQuery(paymentInvoiceQueryOptions(payment.id));

  if (invoice.isPending) {
    return (
      <SidePanelBody>
        <LoadingNotice>Cargando el pago…</LoadingNotice>
      </SidePanelBody>
    );
  }
  if (invoice.isError) {
    return (
      <SidePanelBody>
        {isApiError(invoice.error) &&
        invoice.error.code === "payment_not_found" ? (
          <p role="alert" className="text-cuerpo text-texto-secundario">
            Este pago ya no existe. Cierra el panel y vuelve a abrir la lista.
          </p>
        ) : (
          <QueryFailure
            error={invoice.error}
            what="el pago"
            onRetry={() => void invoice.refetch()}
          />
        )}
      </SidePanelBody>
    );
  }
  return <InvoiceBody invoice={invoice.data} />;
}
