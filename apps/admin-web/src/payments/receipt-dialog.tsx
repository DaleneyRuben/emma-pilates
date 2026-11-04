import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { BodyScrollLock } from "../components/ui/body-scroll-lock";
import { closeButtonClass } from "../components/ui/sheet";
import { cn } from "../lib/cn";
import { useIsNarrowViewport } from "../shell/use-media-query";

/**
 * AW29's «Ver en grande»: the receipt full screen at a narrow width, centred
 * over a dark scrim on a desktop. Nómina opens the same viewer (BKO-008).
 */
export function ReceiptDialog({
  open,
  onOpenChange,
  src,
  alt,
  caption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  caption: string;
}) {
  const narrow = useIsNarrowViewport();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
            if (event.key === "Escape") onOpenChange(false);
          }}
          className={cn(
            "fixed z-50 flex flex-col gap-2 outline-none",
            narrow
              ? "inset-0 overflow-y-auto bg-superficie"
              : "top-1/2 left-1/2 max-w-[min(900px,90vw)] -translate-x-1/2 -translate-y-1/2",
          )}
        >
          <BodyScrollLock />
          <Dialog.Title className="sr-only">Comprobante ampliado</Dialog.Title>
          <div
            className={cn(
              "flex items-center justify-between gap-3",
              narrow && "sticky top-0 bg-superficie px-4 py-3",
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
            src={src}
            alt={alt}
            className={cn(
              narrow
                ? "w-full object-contain"
                : "max-h-[90vh] max-w-full rounded-marco bg-lino object-contain shadow-popover",
            )}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
