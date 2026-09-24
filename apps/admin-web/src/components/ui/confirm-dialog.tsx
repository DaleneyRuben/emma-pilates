import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";

/**
 * A destructive action asks first (AW03 "pide confirmación antes de
 * ejecutarse"); the confirming button carries the Error tone and the other
 * one simply goes back.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel = "Volver",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-panel border border-borde bg-blanco p-5 shadow-popover">
          <AlertDialog.Title className="font-serif text-titulo-panel text-texto">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="flex flex-col gap-2 text-nota text-texto-secundario">
              {children}
            </div>
          </AlertDialog.Description>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <AlertDialog.Cancel asChild>
              <Button variant="neutral">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <Button
              variant="destructive"
              disabled={pending}
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
