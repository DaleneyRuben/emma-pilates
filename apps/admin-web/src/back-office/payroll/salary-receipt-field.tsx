import { ImagePlus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { adminFetch } from "../../api/fetcher";
import {
  checkImage,
  UploadFailure,
  uploadFailureMessage,
  uploadImage,
} from "../../api/upload-image";
import { Button } from "../../components/ui/button";
import { ReceiptDialog } from "../../payments/receipt-dialog";

/** The receipt the form will save: one just uploaded, or the one attached. */
export type SalaryReceipt =
  | { kind: "attached"; url: string }
  | {
      kind: "uploaded";
      imageAssetId: string;
      previewUrl: string;
      name: string;
    };

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "failed"; message: string };

const acceptedTypes = "image/jpeg,image/png,image/webp";

/**
 * AW12 with follow-up 224: an optional photo of the transfer. It goes through
 * the transfer-receipt upload (ADR-0072, 10 MB, no minimum size) and the
 * Trainer sees it in «Mis pagos». Changing it keeps the old one on record.
 */
export function SalaryReceiptField({
  value,
  onChange,
}: {
  value: SalaryReceipt | null;
  onChange: (receipt: SalaryReceipt) => void;
}) {
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [enlarged, setEnlarged] = useState(false);

  const choose = async (file: File) => {
    setStatus({ kind: "uploading" });
    const previewUrl = URL.createObjectURL(file);
    try {
      const refusal = checkImage("transfer_receipt", {
        mediaType: file.type,
        byteSize: file.size,
        width: Number.POSITIVE_INFINITY,
        height: Number.POSITIVE_INFINITY,
      });
      if (refusal !== null) throw new UploadFailure(refusal);
      const imageAssetId = await uploadImage(
        file,
        "transfer_receipt",
        adminFetch,
      );
      onChange({ kind: "uploaded", imageAssetId, previewUrl, name: file.name });
      setStatus({ kind: "idle" });
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setStatus({
        kind: "failed",
        message: uploadFailureMessage(error, "transfer_receipt"),
      });
    }
  };

  const shown =
    value === null
      ? null
      : value.kind === "attached"
        ? { thumbnail: `${value.url}?variant=thumbnail`, full: value.url }
        : { thumbnail: value.previewUrl, full: value.previewUrl };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-baseline gap-2">
        <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
          Comprobante
        </span>
        <span className="text-ayuda text-texto-tenue">Opcional</span>
      </span>
      <input
        ref={input}
        type="file"
        accept={acceptedTypes}
        aria-label="Archivo del comprobante"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file !== undefined) void choose(file);
        }}
      />
      {status.kind === "uploading" ? (
        <p
          role="status"
          className="rounded-control border border-dashed border-borde-fuerte bg-superficie px-4 py-6 text-center text-nota text-texto-tenue"
        >
          Subiendo el comprobante…
        </p>
      ) : shown === null ? (
        <button
          type="button"
          aria-describedby={hintId}
          onClick={() => input.current?.click()}
          className="flex h-24 flex-col items-center justify-center gap-2 rounded-control border border-dashed border-borde-fuerte bg-superficie text-nota font-medium text-primario-profundo hover:border-primario focus-visible:shadow-foco"
        >
          <ImagePlus
            size={20}
            strokeWidth={1.6}
            aria-hidden="true"
            className="text-primario"
          />
          Subir foto del comprobante
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-tarjeta border border-borde bg-lino p-2.5">
          <img
            src={shown.thumbnail}
            alt="Comprobante del pago"
            className="size-14 flex-none rounded-[6px] border border-divisor object-cover"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-nota text-texto">Comprobante adjunto</span>
            {value?.kind === "uploaded" ? (
              <span className="truncate text-ayuda text-texto-tenue">
                {value.name}
              </span>
            ) : null}
          </span>
          <Button variant="link" size="sm" onClick={() => setEnlarged(true)}>
            Ver
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={() => input.current?.click()}
          >
            Cambiar
          </Button>
          <ReceiptDialog
            open={enlarged}
            onOpenChange={setEnlarged}
            src={shown.full}
            alt="Comprobante del pago, ampliado"
            caption="Comprobante del pago"
          />
        </div>
      )}
      {status.kind === "failed" ? (
        <p role="alert" className="text-nota text-error-texto">
          {status.message}
        </p>
      ) : (
        <p id={hintId} className="text-ayuda text-texto-tenue">
          {value?.kind === "attached"
            ? "Cambiarlo guarda el anterior en el registro."
            : "JPG, PNG o WebP, hasta 10 MB. La entrenadora lo ve en su app."}
        </p>
      )}
    </div>
  );
}
