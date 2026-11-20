import { formatListDate } from "@pilates/api-contracts";
import type { AdminPaymentDto } from "@pilates/api-contracts";
import { StatusPill } from "../components/ui/status-pill";
import { boliviaParts } from "../lib/bolivia-time";

/**
 * PAY-007, follow-up 147 §3, and FIX-044 (follow-up 248, W1): AW28's
 * «Factura» column. The Invoice Data or «Sin factura», then the state:
 * «Por emitir» on a confirmed sale, «Emitida» with who
 * uploaded it, or «Emitida · sin archivo» for a mark set before FIX-044.
 * FIX-091 (W4 B): «Subir factura» moved to the row's «⋯» menu.
 */
export function InvoiceCell({ payment }: { payment: AdminPaymentDto }) {
  const issued = payment.invoiceIssued;
  const file = payment.invoiceFile;

  return (
    <span className="flex min-w-0 flex-col gap-1">
      {payment.invoiceData === null ? (
        <span className="tipo-compacto text-texto">Sin factura</span>
      ) : (
        <span className="flex min-w-0 flex-col">
          <span className="tipo-compacto text-texto tabular">
            {payment.invoiceData.taxId}
          </span>
          <span className="max-w-[220px] truncate tipo-secundario text-texto">
            {payment.invoiceData.name}
          </span>
        </span>
      )}
      {payment.invoiceData === null || payment.state === "pending" ? null : (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {issued === null ? (
            payment.state === "confirmed" ? (
              <StatusPill tone="advertencia">Por emitir</StatusPill>
            ) : null
          ) : (
            <>
              <StatusPill tone="exito">Emitida</StatusPill>
              <span className="tipo-secundario text-texto">
                {file === null
                  ? "sin archivo"
                  : `por ${file.uploadedByName} · ${formatListDate(boliviaParts(file.uploadedAt).date)}`}
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
