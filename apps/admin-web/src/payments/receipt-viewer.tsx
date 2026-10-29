import { X, ZoomIn } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { BodyScrollLock } from "../components/ui/body-scroll-lock";
import { Button } from "../components/ui/button";
import { closeButtonClass } from "../components/ui/sheet";
import { cn } from "../lib/cn";
import { useIsNarrowViewport } from "../shell/use-media-query";

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
  const narrow = useIsNarrowViewport();
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
        className="flex justify-center overflow-hidden rounded-control border border-borde bg-blanco focus-visible:shadow-foco"
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
      <Dialog.Root open={enlarged} onOpenChange={setEnlarged}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim-fuerte" />
          <Dialog.Content
            aria-describedby={undefined}
            data-presentation={narrow ? "full-screen" : "viewer"}
            // WEB-036: Radix closes the viewer on Escape only once its layer
            // is the highest, which happens in an effect after the viewer is
            // painted and focused; until then the sheet below ignores the
            // key (see SheetContent), so the viewer closes itself.
            onKeyDown={(event) => {
              if (event.key === "Escape") setEnlarged(false);
            }}
            className={cn(
              "fixed z-50 flex flex-col gap-2 outline-none",
              narrow
                ? "inset-0 overflow-y-auto bg-blanco"
                : "top-1/2 left-1/2 max-w-[min(900px,90vw)] -translate-x-1/2 -translate-y-1/2",
            )}
          >
            <BodyScrollLock />
            <Dialog.Title className="sr-only">
              Comprobante ampliado
            </Dialog.Title>
            <div
              className={cn(
                "flex items-center justify-between gap-3",
                narrow && "sticky top-0 bg-blanco px-4 py-3",
              )}
            >
              <span
                className={cn(
                  "text-ayuda",
                  narrow ? "text-texto-tenue" : "text-superficie",
                )}
              >
                {caption}
              </span>
              <Dialog.Close aria-label="Cerrar" className={closeButtonClass}>
                <X size={16} strokeWidth={1.6} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <img
              src={receiptUrl}
              alt={`${label}, ampliado`}
              className={cn(
                narrow
                  ? "w-full object-contain"
                  : "max-h-[90vh] max-w-full rounded-tarjeta border border-borde bg-blanco object-contain shadow-popover",
              )}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
