import type { AdminPaymentDto } from "@pilates/api-contracts";
import { Button } from "../components/ui/button";
import { StatusPill } from "../components/ui/status-pill";
import { boliviaParts, formatCivilDate } from "../lib/bolivia-time";

/**
 * PAY-007, follow-up 147 §3, and FIX-044 (follow-up 248, W1): AW28's
 * «Factura» column. The Invoice Data or «Sin factura», then the state:
 * «Por emitir» with «Subir factura» on a confirmed sale, «Emitida» with who
 * uploaded it, or «Emitida · sin archivo» for a mark set before FIX-044.
 * «Subir factura» opens the payment's panel, like a click on the row.
 */
export function InvoiceCell({
  payment,
  onOpen,
}: {
  payment: AdminPaymentDto;
  onOpen: () => void;
}) {
  const issued = payment.invoiceIssued;
  const file = payment.invoiceFile;
  const canUpload =
    payment.state === "confirmed" &&
    payment.invoiceData !== null &&
    file === null;

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
      {payment.invoiceData === null || payment.state === "pending" ? null : (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 max-md:justify-end">
          {issued === null ? (
            payment.state === "confirmed" ? (
              <StatusPill tone="advertencia">Por emitir</StatusPill>
            ) : null
          ) : (
            <>
              <StatusPill tone="exito">Emitida</StatusPill>
              <span className="text-ayuda text-texto-tenue">
                {file === null
                  ? "sin archivo"
                  : `por ${file.uploadedByName} · ${formatCivilDate(boliviaParts(file.uploadedAt).date)}`}
              </span>
            </>
          )}
          {canUpload ? (
            <Button
              variant="link"
              size="sm"
              className="px-0"
              aria-label={`Subir factura: ${payment.clientName}`}
              onClick={(event) => {
                // The row opens the same panel; open it once.
                event.stopPropagation();
                onOpen();
              }}
            >
              Subir factura
            </Button>
          ) : null}
        </span>
      )}
    </span>
  );
}
