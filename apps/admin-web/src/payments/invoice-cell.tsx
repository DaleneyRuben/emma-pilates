import type { AdminPaymentDto } from "@pilates/api-contracts";
import type { MouseEvent } from "react";
import { Button } from "../components/ui/button";
import { StatusPill } from "../components/ui/status-pill";
import { boliviaParts, formatCivilDate } from "../lib/bolivia-time";
import { useInvoiceIssuedMark } from "./invoice-queries";

/**
 * PAY-007, follow-up 147 §3: AW28's «Factura» column. The Invoice Data or
 * «Sin factura», and on a confirmed sale the «Factura emitida» mark the
 * Administrator sets and undoes (booking ADR-0012).
 */
export function InvoiceCell({ payment }: { payment: AdminPaymentDto }) {
  const mark = useInvoiceIssuedMark();
  const issued = payment.invoiceIssued;
  const toggle = (event: MouseEvent) => {
    event.stopPropagation();
    mark.mutate({ paymentId: payment.id, issued: issued === null });
  };

  return (
    <span className="flex min-w-0 flex-col gap-1 max-md:items-end max-md:text-right">
      {payment.invoiceData === null ? (
        <span className="text-nota text-texto-tenue">Sin factura</span>
      ) : (
        <span className="flex min-w-0 flex-col max-md:items-end">
          <span className="text-nota text-texto tabular">
            {payment.invoiceData.taxId}
          </span>
          <span className="max-w-[220px] truncate text-ayuda text-texto-tenue">
            {payment.invoiceData.name}
          </span>
        </span>
      )}
      {payment.state !== "confirmed" ? null : issued === null ? (
        <Button
          variant="link"
          size="sm"
          className="self-start px-0"
          aria-label={`Marcar emitida: ${payment.clientName}`}
          busy={mark.isPending}
          onClick={toggle}
        >
          Marcar emitida
        </Button>
      ) : (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 max-md:justify-end">
          <StatusPill tone="exito">Emitida</StatusPill>
          <span className="text-ayuda text-texto-tenue">
            {`por ${issued.issuedByName} · ${formatCivilDate(boliviaParts(issued.issuedAt).date)}`}
          </span>
          <Button
            variant="link"
            size="sm"
            className="px-0"
            aria-label={`Deshacer: ${payment.clientName}`}
            busy={mark.isPending}
            onClick={toggle}
          >
            Deshacer
          </Button>
        </span>
      )}
      {mark.isError ? (
        <span role="alert" className="text-ayuda text-error-texto">
          No pudimos guardar la marca de factura. Inténtalo de nuevo.
        </span>
      ) : null}
    </span>
  );
}
