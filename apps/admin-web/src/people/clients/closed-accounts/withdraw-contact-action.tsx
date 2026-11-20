import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { InlineError } from "../../../components/ui/inline-error";
import { useWithdrawPromotionContact } from "./closed-account-queries";

// BE-022: a «stop» request erases a former Client's contact for good
// (ADR-0097), so the Administrator confirms first (AW35's dialog, the AW22
// convention). Since FIX-060 only former Clients' rows offer it, and since
// FIX-065 they live in Clientas › Cuenta cerrada.
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
        aria-label={`Dejar de enviar a ${contact.name}`}
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
        <p className="tipo-titulo-fila text-texto">
          Esta acción no se puede deshacer.
        </p>
        {failed ? (
          <InlineError>
            No pudimos borrar el contacto. Inténtalo de nuevo.
          </InlineError>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
