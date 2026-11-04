import { ZoomIn } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../components/ui/button";
import { ReceiptDialog } from "./receipt-dialog";

const formats: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
};

type ReceiptViewerProps = {
  /** The authenticated, never-cached receipt route; null once deleted. */
  receiptUrl: string | null;
  /** False when the transfer never had a receipt. */
  receiptMissing?: boolean;
  mediaType: string | undefined;
  clientName: string;
  /** Reads the review again, so an ended session or a deleted receipt shows. */
  onRetry: () => Promise<unknown>;
};

/**
 * AW29 with follow-up 21: the receipt the Administrator checks against the
 * bank, and "Ver en grande" above the panel. The image comes straight from
 * the backend's private route with the session cookie and `no-store`
 * (ADR-0026, ADR-0063); nothing keeps a copy of it.
 */
export function ReceiptViewer({
  receiptUrl,
  receiptMissing = false,
  mediaType,
  clientName,
  onRetry,
}: ReceiptViewerProps) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const label = `Comprobante de ${clientName}`;
  const caption = `Comprobante · ${formats[mediaType ?? ""] ?? "imagen"}`;

  if (receiptUrl === null) {
    return (
      <ReceiptSection>
        <p className="rounded-control border border-divisor bg-superficie px-3 py-6 text-center text-nota text-texto-tenue">
          {receiptMissing
            ? "Todavía no hay comprobante."
            : "El comprobante ya no está disponible."}
        </p>
      </ReceiptSection>
    );
  }

  if (failed) {
    return (
      <ReceiptSection>
        <div
          role="alert"
          className="flex flex-col items-center gap-2 rounded-control border border-divisor bg-superficie px-3 py-6 text-center"
        >
          <p className="text-nota text-texto-secundario">
            No pudimos mostrar el comprobante.
          </p>
          <Button
            variant="neutral"
            size="sm"
            onClick={() =>
              void onRetry().then(() => {
                setAttempt((count) => count + 1);
                setFailed(false);
              })
            }
          >
            Reintentar
          </Button>
        </div>
      </ReceiptSection>
    );
  }

  return (
    <ReceiptSection
      action={
        <Button variant="link" size="sm" onClick={() => setEnlarged(true)}>
          <ZoomIn size={14} strokeWidth={1.6} aria-hidden="true" />
          Ver en grande
        </Button>
      }
    >
      <button
        type="button"
        onClick={() => setEnlarged(true)}
        className="flex justify-center overflow-hidden rounded-control bg-lino focus-visible:shadow-foco"
      >
        <img
          key={attempt}
          src={receiptUrl}
          alt={label}
          onError={() => setFailed(true)}
          className="max-h-[360px] w-auto object-contain"
        />
      </button>
      <p className="text-ayuda text-texto-muy-tenue">{caption}</p>
      <ReceiptDialog
        open={enlarged}
        onOpenChange={setEnlarged}
        src={receiptUrl}
        alt={`${label}, ampliado`}
        caption={caption}
      />
    </ReceiptSection>
  );
}

function ReceiptSection({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
          Comprobante
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
