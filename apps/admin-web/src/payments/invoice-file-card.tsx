import { formatDateTime } from "@pilates/api-contracts";
import type {
  StaffInvoiceDto,
  StaffInvoiceFileDto,
} from "@pilates/api-contracts";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { WarningRow } from "../auth/auth-notices";
import { Button, buttonVariants } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { invoiceFileUrl, useRemoveInvoice } from "./invoice-queries";

const sizeFormat = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 0,
});

const sizeOf = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
    : `${sizeFormat.format(Math.max(1, Math.round(bytes / 1024)))} KB`;

const kindOf = (mediaType: StaffInvoiceFileDto["mediaType"]) =>
  mediaType === "application/pdf" ? "PDF" : "Foto";

// W1's «Emitida» card: the file, who uploaded it, and its three actions.
export function InvoiceFileCard({
  invoice,
  file,
  onReplace,
}: {
  invoice: StaffInvoiceDto;
  file: StaffInvoiceFileDto;
  /** Absent when no new file may be attached (a voided sale, no data). */
  onReplace?: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const remove = useRemoveInvoice(invoice.paymentId);
  const firstName = invoice.clientName.split(" ")[0];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-tarjeta bg-superficie shadow-tarjeta px-3.5 py-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-control bg-superficie text-primario">
          <FileText size={22} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-cuerpo text-texto">
            {file.fileName}
          </span>
          <span className="text-ayuda text-texto">
            {`${kindOf(file.mediaType)} · ${sizeOf(file.byteSize)} · subida por ${file.uploadedByName} · ${formatDateTime(file.uploadedAt)}`}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={invoiceFileUrl(invoice.paymentId)}
          download={file.fileName}
          aria-label="Descargar factura"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <Download size={16} strokeWidth={1.8} aria-hidden="true" />
          Descargar
        </a>
        <span className="flex-1" />
        {onReplace === undefined ? null : (
          <Button variant="ghost" size="sm" onClick={onReplace}>
            Reemplazar
          </Button>
        )}
        {/* Owner, 2026-11-05: a voided sale's invoice stays with the Client. */}
        {invoice.voided ? null : (
          <Button
            variant="ghost"
            size="sm"
            className="text-texto hover:text-texto"
            onClick={() => setAsking(true)}
          >
            Quitar factura
          </Button>
        )}
      </div>
      {remove.isError ? (
        <WarningRow>
          No pudimos quitar la factura. Inténtalo de nuevo.
        </WarningRow>
      ) : null}
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title="¿Quitar la factura?"
        confirmLabel="Quitar factura"
        cancelLabel="Cancelar"
        busy={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, { onSettled: () => setAsking(false) })
        }
      >
        <p>
          {`${firstName} dejará de verla en Mis facturas y el pago vuelve a quedar por emitir. Queda registrado quién la quitó.`}
        </p>
      </ConfirmDialog>
    </section>
  );
}
