import { useState } from "react";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { removalProblem } from "./booking-problems";
import { useRemoveBooking } from "./session-roster-queries";

// W1 (Editar clase A): «Quitar» on a booked Client, asked first; the backend
// keeps the cancellation window, so a refusal is explained in the dialog.
export function RemoveBookingAction({
  sessionId,
  branchId,
  bookingId,
  clientName,
  onRemoved,
}: {
  sessionId: string;
  branchId: string;
  bookingId: string;
  clientName: string;
  onRemoved: (notice: string) => void;
}) {
  const remove = useRemoveBooking(sessionId, branchId);
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const confirm = async () => {
    setFailure(null);
    try {
      await remove.mutateAsync(bookingId);
      setOpen(false);
      onRemoved(`Quitamos a ${clientName} de la clase.`);
    } catch (error) {
      setFailure(removalProblem(error));
    }
  };

  return (
    <>
      <Button
        variant="link"
        size="sm"
        aria-label={`Quitar a ${clientName}`}
        className="underline"
        onClick={() => {
          setFailure(null);
          setOpen(true);
        }}
      >
        Quitar
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Quitar a ${clientName} de esta clase?`}
        confirmLabel="Quitar"
        busy={remove.isPending}
        onConfirm={() => void confirm()}
      >
        <p>
          La clase vuelve a su plan y, si hay lista de espera, entra la primera.
        </p>
        {failure === null ? null : (
          <p role="alert" className="font-semibold text-texto">
            {failure}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
