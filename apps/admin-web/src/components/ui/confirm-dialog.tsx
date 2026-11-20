import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { BodyScrollLock } from "./body-scroll-lock";
import { cn } from "../../lib/cn";
import { Button } from "./button";

/**
 * A destructive action asks first (AW03 "pide confirmación antes de
 * ejecutarse"). Rosa Emma (rw.py dialog, RW-gastos-eliminar): a centred
 * white card; the confirming button is the solid primary and «Volver» a
 * text link, whatever the tone (no colour is red).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel = "Volver",
  pending = false,
  busy = false,
  wide = false,
  confirmDescribedBy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Not available for another reason; the confirming button is grey. */
  pending?: boolean;
  /** The confirmation's own request is in flight (follow-up 93). */
  busy?: boolean;
  /** Kept for callers; Rosa Emma draws both tones as the solid primary. */
  tone?: "destructive" | "primary";
  /** Room for a picture beside the details (FIX-072's payout QR). */
  wide?: boolean;
  /** The id of what explains a grey confirming button. */
  confirmDescribedBy?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <AlertDialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-3.5 rounded-hero bg-superficie px-7 pt-[26px] pb-[22px] shadow-dialogo",
            wide
              ? "max-h-[calc(100vh-32px)] w-[min(820px,calc(100vw-32px))] overflow-y-auto"
              : "w-[min(480px,calc(100vw-32px))]",
          )}
        >
          <BodyScrollLock />
          <AlertDialog.Title className="tipo-titulo-seccion text-texto">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="flex flex-col gap-3 tipo-cuerpo text-texto">
              {children}
            </div>
          </AlertDialog.Description>
          <div className="flex flex-wrap items-center justify-end gap-3 pt-1.5">
            <AlertDialog.Cancel asChild>
              <Button variant="link" className="px-2">
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="primary"
              busy={busy}
              disabled={pending}
              aria-describedby={confirmDescribedBy}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
