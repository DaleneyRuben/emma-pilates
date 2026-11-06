import { FileText, Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { isApiError } from "../api/problem";
import {
  checkImage,
  UploadFailure,
  uploadFailureMessage,
} from "../api/upload-image";
import { WarningRow } from "../auth/auth-notices";
import { Button } from "../components/ui/button";
import { cn } from "../lib/cn";
import { useUploadInvoice } from "./invoice-queries";

const accept = "application/pdf,image/jpeg,image/png";

// The payment changed after the panel opened (another person, or a void).
const conflicts: Record<string, string> = {
  payment_voided: "Este pago fue anulado y ya no recibe factura.",
  payment_not_confirmed: "Este pago todavía no está confirmado.",
  payment_without_invoice_data: "La clienta no pidió factura en este pago.",
};

const isConflict = (error: unknown): boolean =>
  isApiError(error) && conflicts[error.code] !== undefined;

const failureMessage = (error: unknown): string =>
  (isApiError(error) ? conflicts[error.code] : undefined) ??
  uploadFailureMessage(error, "invoice");

const assetOf = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "imageAssetId" in error
    ? String((error as { imageAssetId: unknown }).imageAssetId)
    : undefined;

// W1's dropzone, the upload in flight, and its failures (E5's states).
export function InvoiceUploadField({
  paymentId,
  clientName,
  onUploaded,
  onCancel,
}: {
  paymentId: string;
  clientName: string;
  onUploaded: () => void;
  onCancel?: () => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [chosen, setChosen] = useState<File | null>(null);
  const upload = useUploadInvoice(paymentId);
  const firstName = clientName.split(" ")[0];

  const send = (file: File, imageAssetId?: string) =>
    upload.mutate({ file, imageAssetId }, { onSuccess: onUploaded });

  const choose = (file: File | undefined) => {
    if (file === undefined) return;
    upload.reset();
    const refused = checkImage("invoice", {
      mediaType: file.type,
      byteSize: file.size,
      width: 0,
      height: 0,
    });
    if (refused !== null) {
      setChosen(null);
      setRefusal(uploadFailureMessage(new UploadFailure(refused), "invoice"));
      return;
    }
    setRefusal(null);
    setChosen(file);
    send(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    choose(event.dataTransfer.files[0]);
  };

  return (
    <section className="flex flex-col gap-3">
      {upload.isPending || (upload.isError && chosen !== null) ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-marco px-3.5 py-3",
            upload.isError ? "bg-error-tinte" : "bg-lino",
          )}
        >
          <FileText
            size={22}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-primario"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-cuerpo">{chosen?.name}</span>
            {upload.isPending ? (
              <span
                role="progressbar"
                aria-label="Subiendo la factura"
                className="h-1.5 overflow-hidden rounded-full bg-arena"
              >
                <span className="block h-full w-3/5 animate-pulse rounded-full bg-primario" />
              </span>
            ) : (
              <span className="text-ayuda text-texto-tenue">No se subió</span>
            )}
          </span>
        </div>
      ) : (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center gap-2 rounded-marco border-[1.5px] border-dashed border-borde-fuerte px-4 py-5 text-center"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-rosa-tinte text-primario">
            <Upload size={20} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <span className="text-cuerpo">
            Arrastra aquí la factura o elige un archivo
          </span>
          <span className="text-ayuda text-texto-tenue">
            PDF, JPG o PNG, hasta 10 MB
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => input.current?.click()}
          >
            Elegir archivo
          </Button>
          <label htmlFor={inputId} className="sr-only">
            Archivo de la factura
          </label>
          <input
            id={inputId}
            ref={input}
            type="file"
            accept={accept}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      )}
      {refusal === null ? null : <WarningRow>{refusal}</WarningRow>}
      {upload.isError ? (
        <>
          <WarningRow>{failureMessage(upload.error)}</WarningRow>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                upload.reset();
                setChosen(null);
              }}
            >
              Elegir otro archivo
            </Button>
            {chosen === null || isConflict(upload.error) ? null : (
              <Button onClick={() => send(chosen, assetOf(upload.error))}>
                Reintentar
              </Button>
            )}
          </div>
        </>
      ) : null}
      {upload.isPending || upload.isError ? null : (
        <p className="text-ayuda text-texto-tenue">
          {`Al subirla, el pago queda como factura emitida y ${firstName} la ve en su app.`}
        </p>
      )}
      {onCancel === undefined || upload.isPending ? null : (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Volver a la factura actual
        </Button>
      )}
    </section>
  );
}
