import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useWithdrawPromotionContact } from "./contact-queries";

// BE-022: a «stop» request erases the contact for good (ADR-0097), so the
// Administrator confirms first (AW35's dialog, the AW22 convention).
export function WithdrawContactAction({
  contact,
  onWithdrawn,
}: {
  contact: AdminPromotionContactDto;
  onWithdrawn: (notice: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const withdraw = useWithdrawPromotionContact();

  const confirm = async () => {
    setFailed(false);
    try {
      await withdraw.mutateAsync(contact.id);
      setOpen(false);
      onWithdrawn(`Borramos el contacto de ${contact.name}.`);
    } catch {
      setFailed(true);
    }
  };

  return (
    <>
      <Button
        variant="link"
        size="sm"
        className="text-error hover:text-error-texto"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        Dejar de enviar
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Dejar de enviar promociones a ${contact.name}?`}
        confirmLabel="Borrar contacto"
        busy={withdraw.isPending}
        onConfirm={() => void confirm()}
      >
        <p className="text-texto">
          Borramos su nombre, correo y teléfono de esta lista. Usa esto cuando
          la persona te pida que paremos.
        </p>
        <p className="font-medium text-texto">
          Esta acción no se puede deshacer.
        </p>
        {failed ? (
          <p role="alert" className="text-error-texto">
            No pudimos borrar el contacto. Inténtalo de nuevo.
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
